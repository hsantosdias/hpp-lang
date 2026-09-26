import { Expr, Stmt } from './ast.js';
import { KeywordKind, Token } from './tokens.js';

export interface ParseError {
  line: number;
  col: number;
  message: string;
}

/** Parser descendente recursivo (mensagens em PT, com linha). */
export class Parser {
  private pos = 0;
  errors: ParseError[] = [];

  constructor(private tokens: Token[]) {}

  parse(): Stmt[] {
    const body = this.parseBlock(new Set());
    this.expectEOF();
    return body;
  }

  // ---- utilidades ----

  private peek(): Token {
    return this.tokens[this.pos] ?? this.tokens[this.tokens.length - 1];
  }

  private next(): Token {
    const t = this.peek();
    if (t.type !== 'EOF') this.pos++;
    return t;
  }

  private err(t: Token, message: string): void {
    this.errors.push({ line: t.line, col: t.col, message });
  }

  private skipBreaks(): void {
    while (this.peek().type === 'NEWLINE' || (this.peek().type === 'PUNCT' && this.peek().value === ';')) {
      this.next();
    }
  }

  private isKw(kind: KeywordKind): boolean {
    const t = this.peek();
    return t.type === 'KEYWORD' && t.keyword === kind;
  }

  /** `SE x = 1`: = sozinho é atribuição — em condição, sugerir ==. */
  private hintEquals(t: Token): void {
    const n = this.peek();
    if (n.type === 'OP' && n.value === '=') {
      this.err(n, 'Para comparar use == (ex.: SE x == 1). O = sozinho guarda valor: x = 1.');
    }
  }

  private expectEOF(): void {
    this.skipBreaks();
    if (this.peek().type !== 'EOF') {
      this.err(this.peek(), `Não entendi "${this.peek().value}" aqui — faltou FIM/END antes?`);
    }
  }

  /** Bloco até FIM, SENAO ou fim do programa. */
  private parseBlock(stoppers: Set<string>): Stmt[] {
    const out: Stmt[] = [];
    for (;;) {
      this.skipBreaks();
      const t = this.peek();
      if (t.type === 'EOF') break;
      if (t.type === 'KEYWORD' && stoppers.has(t.keyword ?? '')) break;
      const s = this.parseStmt();
      if (s) out.push(s);
      else this.recover();
    }
    return out;
  }

  /** Pula até o próximo separador após erro (continua achando mais erros). */
  private recover(): void {
    let guard = 0;
    while (this.peek().type !== 'EOF' && this.peek().type !== 'NEWLINE' && guard++ < 50) {
      this.next();
    }
  }

  private parseStmt(): Stmt | null {
    const t = this.peek();
    if (t.type === 'KEYWORD') {
      switch (t.keyword) {
        case 'IF':
        case 'WHEN':
          return this.parseIf();
        case 'WHILE':
          return this.parseWhile();
        case 'REPEAT':
          return this.parseRepeat();
        case 'FOR':
          return this.parseFor();
        case 'FUNCTION':
          return this.parseFunc();
        case 'RETURN':
          return this.parseReturn();
        case 'ALWAYS':
          return this.parseAlways();
        default:
          this.err(t, `"${t.value}" não pode começar uma frase aqui.`);
          return null;
      }
    }
    if (t.type === 'ACTION') return this.parseAction();
    if (t.type === 'IDENT') return this.parseAssignOrCall();
    if (t.type === 'EOF') return null;
    this.err(t, `Não entendi "${t.value}" — frase deve começar com ação (ANDAR, CHUTAR…), SE, ENQUANTO ou nome.`);
    return null;
  }

  private parseIf(): Stmt | null {
    const t = this.next(); // SE/QUANDO
    const cond = this.parseExpr();
    if (!cond) return null;
    this.hintEquals(t);
    if (this.isKw('THEN')) this.next(); // ENTÃO opcional
    const then = this.parseBlock(new Set(['ELSE', 'END']));
    let otherwise: Stmt[] = [];
    if (this.isKw('ELSE')) {
      const elseTok = this.next();
      const chained = this.parseElseTail(elseTok);
      if (chained === null) return null;
      otherwise = chained;
    }
    if (!this.isKw('END')) {
      this.err(this.peek(), 'Faltou FIM/END para fechar o SE.');
      return null;
    }
    this.next();
    return { kind: 'if', cond, then, otherwise, line: t.line };
  }

  /**
   * Ramo do SENAO. Se o próximo SE/QUANDO está na MESMA linha do SENAO,
   * encadeia como else-if sem FIM próprio (um FIM só fecha a cadeia).
   * Caso contrário, comportamento clássico (SE aninhado com FIM próprio).
   */
  private parseElseTail(elseTok: Token): Stmt[] | null {
    const nxt = this.peek();
    if (nxt.type === 'KEYWORD' && (nxt.keyword === 'IF' || nxt.keyword === 'WHEN')) {
      if (nxt.line === elseTok.line) {
        const chained = this.parseIfChain();
        if (!chained) return null;
        return [chained];
      }
      const nested = this.parseIf();
      if (!nested) return null;
      return [nested];
    }
    return this.parseBlock(new Set(['END']));
  }

  /**
   * SE encadeado (else-if): como parseIf, mas NÃO consome o FIM final —
   * o FIM único de fechamento pertence ao SE externo da cadeia.
   */
  private parseIfChain(): Stmt | null {
    const t = this.next(); // SE/QUANDO (mesma linha do SENAO)
    const cond = this.parseExpr();
    if (!cond) return null;
    if (this.isKw('THEN')) this.next(); // ENTÃO opcional
    const then = this.parseBlock(new Set(['ELSE', 'END']));
    let otherwise: Stmt[] = [];
    if (this.isKw('ELSE')) {
      const elseTok = this.next();
      const tail = this.parseElseTail(elseTok);
      if (!tail) return null;
      otherwise = tail;
    }
    return { kind: 'if', cond, then, otherwise, line: t.line };
  }

  private parseWhile(): Stmt | null {
    const t = this.next();
    const cond = this.parseExpr();
    if (!cond) return null;
    this.hintEquals(t);
    if (this.isKw('DO')) this.next(); // FAÇA opcional
    const body = this.parseBlock(new Set(['END']));
    if (!this.isKw('END')) {
      this.err(this.peek(), 'Faltou FIM/END para fechar o ENQUANTO.');
      return null;
    }
    this.next();
    return { kind: 'while', cond, body, line: t.line };
  }

  private parseRepeat(): Stmt | null {
    const t = this.next(); // REPETIR
    const count = this.parseExpr();
    if (!count) return null;
    if (this.isKw('TIMES')) this.next();
    else {
      this.err(this.peek(), 'Depois de REPETIR número vem VEZES. Ex.: REPETIR 3 VEZES … FIM');
      return null;
    }
    const body = this.parseBlock(new Set(['END']));
    if (!this.isKw('END')) {
      this.err(this.peek(), 'Faltou FIM/END para fechar o REPETIR.');
      return null;
    }
    this.next();
    return { kind: 'repeat', count, body, line: t.line };
  }

  private parseFor(): Stmt | null {
    const t = this.next(); // PARA
    const name = this.peek();
    if (name.type !== 'IDENT') {
      this.err(name, 'PARA precisa de um nome. Ex.: PARA i DE 1 ATE 5 … FIM');
      return null;
    }
    this.next();
    if (!this.isKw('FROM')) {
      this.err(this.peek(), 'Faltou DE. Ex.: PARA i DE 1 ATE 5 … FIM');
      return null;
    }
    this.next();
    const from = this.parseExpr();
    if (!from) return null;
    if (!this.isKw('TO')) {
      this.err(this.peek(), 'Faltou ATE. Ex.: PARA i DE 1 ATE 5 … FIM');
      return null;
    }
    this.next();
    const to = this.parseExpr();
    if (!to) return null;
    let step: Expr | null = null;
    if (this.isKw('STEP')) {
      this.next();
      step = this.parseExpr();
      if (!step) return null;
    }
    const body = this.parseBlock(new Set(['END']));
    if (!this.isKw('END')) {
      this.err(this.peek(), 'Faltou FIM/END para fechar o PARA.');
      return null;
    }
    this.next();
    return { kind: 'for', name: name.value, from, to, step, body, line: t.line };
  }

  private parseFunc(): Stmt | null {
    const t = this.next(); // FUNÇÃO
    const name = this.peek();
    if (name.type !== 'IDENT') {
      this.err(name, 'FUNCAO precisa de um nome. Ex.: FUNCAO onda() … FIM');
      return null;
    }
    this.next();
    const params: string[] = [];
    const open = this.peek();
    if (open.type === 'PUNCT' && open.value === '(') {
      this.next();
      for (;;) {
        const p = this.peek();
        if (p.type === 'PUNCT' && p.value === ')') {
          this.next();
          break;
        }
        if (p.type !== 'IDENT') {
          this.err(p, 'Nome de entrada inválido na FUNCAO.');
          return null;
        }
        params.push(p.value);
        this.next();
        const sep = this.peek();
        if (sep.type === 'PUNCT' && sep.value === ',') this.next();
        else if (sep.type === 'PUNCT' && sep.value === ')') continue;
        else {
          this.err(sep, 'Faltou vírgula ou ) na FUNCAO.');
          return null;
        }
      }
    }
    const body = this.parseBlock(new Set(['END']));
    if (!this.isKw('END')) {
      this.err(this.peek(), 'Faltou FIM/END para fechar a FUNCAO.');
      return null;
    }
    this.next();
    return { kind: 'func', name: name.value, params, body, line: t.line };
  }

  private parseReturn(): Stmt | null {
    const t = this.next();
    // RETORNAR sozinho ou com valor (se a próxima linha/frase começa, é vazio).
    // TRUE/FALSE/NOT iniciam expressão — `RETORNAR VERDADEIRO` devolve true.
    const n = this.peek();
    if (
      n.type === 'NEWLINE' ||
      n.type === 'EOF' ||
      (n.type === 'PUNCT' && n.value === ';') ||
      (n.type === 'KEYWORD' && n.keyword !== 'TRUE' && n.keyword !== 'FALSE' && n.keyword !== 'NOT')
    ) {
      return { kind: 'return', expr: null, line: t.line };
    }
    const expr = this.parseExpr();
    if (!expr) return null;
    return { kind: 'return', expr, line: t.line };
  }

  private parseAlways(): Stmt | null {
    const t = this.next(); // SEMPRE
    const body = this.parseBlock(new Set(['END']));
    if (!this.isKw('END')) {
      this.err(this.peek(), 'Faltou FIM/END para fechar o SEMPRE.');
      return null;
    }
    this.next();
    return { kind: 'always', body, line: t.line };
  }

  private parseAction(): Stmt | null {
    const t = this.next();
    const spec = t.action;
    if (!spec) return null;
    const args: Expr[] = [];
    for (let a = 0; a < spec.args; a++) {
      // `ANDAR_POR 0.5, 2` / `MOTORES -0.5, 0.5`: vírgula é separadora.
      // Também aceita sem vírgula (`MOTOR 1 0.5`), como sempre fez o H++.
      if (a > 0 && this.peek().type === 'PUNCT' && this.peek().value === ',') this.next();
      const e = this.parseExpr();
      if (!e) {
        const ex = spec.args === 2 ? '0.5, 2' : '0.5';
        this.err(this.peek(), `"${t.value}" precisa de ${spec.args} valor(es). Ex.: ${t.value} ${ex}`);
        return null;
      }
      args.push(e);
    }
    return { kind: 'action', name: spec.name, args, line: t.line };
  }

  private parseAssignOrCall(): Stmt | null {
    const name = this.next();
    const after = this.peek();
    // nome = valor
    if (after.type === 'OP' && after.value === '=') {
      this.next();
      const expr = this.parseExpr();
      if (!expr) {
        this.err(this.peek(), `Faltou o valor depois de "${name.value} =".`);
        return null;
      }
      return { kind: 'assign', name: name.value, expr, line: name.line };
    }
    // chamada funcao(args) como frase
    if (after.type === 'PUNCT' && after.value === '(') {
      const call = this.parseCall(name);
      if (!call) return null;
      return { kind: 'expr', expr: call, line: name.line };
    }
    this.err(after, `Depois de "${name.value}" eu esperava = ou (. Ex.: ${name.value} = 1`);
    return null;
  }

  private parseCall(name: Token): Expr | null {
    this.next(); // (
    const args: Expr[] = [];
    const first = this.peek();
    if (first.type === 'PUNCT' && first.value === ')') {
      this.next();
      return { kind: 'call', name: name.value, args, line: name.line };
    }
    for (;;) {
      const e = this.parseExpr();
      if (!e) return null;
      args.push(e);
      const sep = this.peek();
      if (sep.type === 'PUNCT' && sep.value === ',') {
        this.next();
        continue;
      }
      if (sep.type === 'PUNCT' && sep.value === ')') {
        this.next();
        break;
      }
      this.err(sep, 'Faltou vírgula ou ) na chamada.');
      return null;
    }
    return { kind: 'call', name: name.value, args, line: name.line };
  }

  // ---- expressões (precedência) ----

  private parseExpr(): Expr | null {
    return this.parseOr();
  }

  private parseOr(): Expr | null {
    let left = this.parseAnd();
    if (!left) return null;
    while (this.isKw('OR')) {
      const t = this.next();
      const right = this.parseAnd();
      if (!right) return null;
      left = { kind: 'binary', op: 'OR', left, right, line: t.line };
    }
    return left;
  }

  private parseAnd(): Expr | null {
    let left = this.parseNot();
    if (!left) return null;
    while (this.isKw('AND')) {
      const t = this.next();
      const right = this.parseNot();
      if (!right) return null;
      left = { kind: 'binary', op: 'AND', left, right, line: t.line };
    }
    return left;
  }

  private parseNot(): Expr | null {
    if (this.isKw('NOT')) {
      const t = this.next();
      const e = this.parseNot();
      if (!e) return null;
      return { kind: 'unary', op: 'NOT', expr: e, line: t.line };
    }
    return this.parseComp();
  }

  private parseComp(): Expr | null {
    const left = this.parseAdd();
    if (!left) return null;
    const t = this.peek();
    if (t.type === 'OP' && ['==', '!=', '<', '<=', '>', '>='].includes(t.value)) {
      this.next();
      const right = this.parseAdd();
      if (!right) {
        this.err(this.peek(), 'Faltou o valor depois da comparação.');
        return null;
      }
      return { kind: 'binary', op: t.value, left, right, line: t.line };
    }
    return left;
  }

  private parseAdd(): Expr | null {
    let left = this.parseMul();
    if (!left) return null;
    for (;;) {
      const t = this.peek();
      if (t.type === 'OP' && (t.value === '+' || t.value === '-')) {
        this.next();
        const right = this.parseMul();
        if (!right) {
          this.err(this.peek(), 'Faltou número depois do sinal.');
          return null;
        }
        left = { kind: 'binary', op: t.value, left, right, line: t.line };
        continue;
      }
      return left;
    }
  }

  private parseMul(): Expr | null {
    let left = this.parseUnary();
    if (!left) return null;
    for (;;) {
      const t = this.peek();
      if (t.type === 'OP' && (t.value === '*' || t.value === '/' || t.value === '%')) {
        this.next();
        const right = this.parseUnary();
        if (!right) {
          this.err(this.peek(), 'Faltou número depois do sinal.');
          return null;
        }
        left = { kind: 'binary', op: t.value, left, right, line: t.line };
        continue;
      }
      return left;
    }
  }

  private parseUnary(): Expr | null {
    const t = this.peek();
    if (t.type === 'OP' && t.value === '-') {
      this.next();
      const e = this.parseUnary();
      if (!e) return null;
      return { kind: 'unary', op: '-', expr: e, line: t.line };
    }
    if (this.isKw('NOT')) {
      this.next();
      const e = this.parseUnary();
      if (!e) return null;
      return { kind: 'unary', op: 'NOT', expr: e, line: t.line };
    }
    return this.parsePower();
  }

  private parsePower(): Expr | null {
    const base = this.parsePrimary();
    if (!base) return null;
    const t = this.peek();
    if (t.type === 'OP' && t.value === '^') {
      this.next();
      const exp = this.parseUnary();
      if (!exp) {
        this.err(this.peek(), 'Faltou número depois de ^.');
        return null;
      }
      return { kind: 'binary', op: '^', left: base, right: exp, line: t.line };
    }
    return base;
  }

  private parsePrimary(): Expr | null {
    const t = this.peek();
    if (t.type === 'NUMBER') {
      this.next();
      return { kind: 'num', value: t.numValue ?? 0, line: t.line };
    }
    if (t.type === 'STRING') {
      this.next();
      return { kind: 'str', value: t.value, line: t.line };
    }
    if (t.type === 'KEYWORD' && (t.keyword === 'TRUE' || t.keyword === 'FALSE')) {
      this.next();
      return { kind: 'bool', value: t.keyword === 'TRUE', line: t.line };
    }
    if (t.type === 'IDENT') {
      this.next();
      const after = this.peek();
      if (after.type === 'PUNCT' && after.value === '(') {
        return this.parseCall(t);
      }
      return { kind: 'var', name: t.value, line: t.line };
    }
    if (t.type === 'PUNCT' && t.value === '(') {
      this.next();
      const e = this.parseExpr();
      if (!e) return null;
      const close = this.peek();
      if (close.type !== 'PUNCT' || close.value !== ')') {
        this.err(close, 'Faltou ) para fechar a conta.');
        return null;
      }
      this.next();
      return e;
    }
    this.err(t, `Esperava número, nome ou (conta), mas achei "${t.value}".`);
    return null;
  }
}
