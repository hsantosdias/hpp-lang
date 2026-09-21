import { Token, lookupAction, lookupKeyword, type ActionSpec } from './tokens.js';

export interface LexError {
  line: number;
  col: number;
  message: string;
}

const OPS = ['==', '!=', '<=', '>=', '+', '-', '*', '/', '%', '^', '=', '<', '>'];
const PUNCT = ['(', ')', ',', ';'];

// Letras latinas incl. acentos (NÃO, É, bússola...). Acentos são removidos
// na normalização abaixo, então NÃO==NAO e É==E para o compilador.
const WORD_START = /[A-Za-z_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/;
const WORD_CHAR = /[A-Za-z0-9_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/;

/** Remove diacríticos: 'NÃO'→'NAO', 'É'→'E'. Identidade p/ ASCII. */
export function stripAccents(word: string): string {
  return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Tokenizador bilíngue, insensível a maiúsculas; comentário com `#`. */
export interface LexOptions {
  /**
   * Verbos do domínio (ver `ExtensionDescriptor.verbs`): palavra → ação
   * canônica. Ex.: Line pode mapear SEGUIR→aimMain sem tocar a gramática.
   */
  extraActions?: Record<string, ActionSpec>;
}

export function lex(source: string, opts: LexOptions = {}): { tokens: Token[]; errors: LexError[] } {
  const tokens: Token[] = [];
  const errors: LexError[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  let depth = 0; // parênteses: vírgula dentro deles é separador (MIN(1,2))

  const push = (t: Omit<Token, 'line' | 'col'>, l = line, c = col) => {
    tokens.push({ ...t, line: l, col: c });
  };

  while (i < source.length) {
    const ch = source[i];

    // Espaço / tab
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i++;
      col++;
      continue;
    }
    // Quebra de linha (separador de comandos)
    if (ch === '\n') {
      push({ type: 'NEWLINE', value: '\\n' });
      i++;
      line++;
      col = 1;
      continue;
    }
    // Comentário até o fim da linha
    if (ch === '#') {
      while (i < source.length && source[i] !== '\n') {
        i++;
        col++;
      }
      continue;
    }
    // Número (com ou sem ponto decimal)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      const start = i;
      const startCol = col;
      let dot = false;
      while (i < source.length && (/[0-9]/.test(source[i]) || (source[i] === '.' && !dot))) {
        if (source[i] === '.') dot = true;
        i++;
        col++;
      }
      const raw = source.slice(start, i);
      push({ type: 'NUMBER', value: raw, numValue: parseFloat(raw) }, line, startCol);
      continue;
    }
    // Texto "entre aspas"
    if (ch === '"') {
      const startCol = col;
      const startLine = line;
      i++;
      col++;
      let out = '';
      let closed = false;
      while (i < source.length) {
        const c = source[i];
        if (c === '\\' && i + 1 < source.length) {
          const n = source[i + 1];
          out += n === 'n' ? '\n' : n === '"' ? '"' : n === '\\' ? '\\' : n;
          i += 2;
          col += 2;
          continue;
        }
        if (c === '"') {
          closed = true;
          i++;
          col++;
          break;
        }
        if (c === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
        out += c;
        i++;
      }
      if (!closed) {
        errors.push({ line: startLine, col: startCol, message: 'Texto sem fechar aspas — falta " no final.' });
      }
      push({ type: 'STRING', value: out }, startLine, startCol);
      continue;
    }
    // Palavra: palavra-chave, ação ou nome (com ou sem acento)
    if (WORD_START.test(ch)) {
      const start = i;
      const startCol = col;
      while (i < source.length && WORD_CHAR.test(source[i])) {
        i++;
        col++;
      }
      const raw = source.slice(start, i);
      const plain = stripAccents(raw);
      const kw = lookupKeyword(plain);
      if (kw) {
        push({ type: 'KEYWORD', value: plain.toUpperCase(), keyword: kw }, line, startCol);
        continue;
      }
      const act = lookupAction(plain) ?? opts.extraActions?.[plain.toUpperCase()];
      if (act) {
        push({ type: 'ACTION', value: plain.toUpperCase(), action: act }, line, startCol);
        continue;
      }
      push({ type: 'IDENT', value: plain.toLowerCase() }, line, startCol);
      continue;
    }
    // Operadores (2 chars primeiro)
    const two = source.slice(i, i + 2);
    if (OPS.includes(two)) {
      push({ type: 'OP', value: two });
      i += 2;
      col += 2;
      continue;
    }
    if (OPS.includes(ch)) {
      push({ type: 'OP', value: ch });
      i++;
      col++;
      continue;
    }
    if (PUNCT.includes(ch)) {
      // `0,5` fora de parênteses: vírgula colada entre dígitos é quase sempre
      // decimal PT — erro dedicado (dentro de parênteses é separador: MIN(1,2)).
      if (ch === ',' && depth === 0) {
        const prevCh = source[i - 1] ?? '';
        const nxt = source[i + 1] ?? '';
        if (/[0-9]/.test(prevCh) && /[0-9]/.test(nxt)) {
          errors.push({
            line,
            col,
            message: 'Vírgula em número? Use ponto para decimal: 0.5 (a vírgula separa argumentos, ex.: MIN(1, 2)).'
          });
        }
      }
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      push({ type: 'PUNCT', value: ch });
      i++;
      col++;
      continue;
    }
    errors.push({ line, col, message: `Caractere estranho "${ch}" — apague ou use # para comentário.` });
    i++;
    col++;
  }
  push({ type: 'EOF', value: '' });
  return { tokens, errors };
}
