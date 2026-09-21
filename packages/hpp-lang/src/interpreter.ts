import { Expr, Stmt } from './ast.js';
import { Hardware, SensorValue } from './hardware.js';
import { HppError, RuntimeError } from './errors.js';

export type { HppError } from './errors.js';
export { RuntimeError } from './errors.js';

export type Value = number | boolean | string | HppFunction | Builtin;

export interface HppFunction {
  __fn: true;
  name: string;
  params: string[];
  body: Stmt[];
}

export interface Builtin {
  __builtin: true;
  name: string;
  arity: number;
  impl: (args: Value[]) => Value;
}

class ReturnSignal {
  constructor(public value: Value) {}
}

function isNum(v: Value): v is number {
  return typeof v === 'number';
}

function truthy(v: Value): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  return true;
}

const BUILTINS: Record<string, Builtin> = {
  abs: { __builtin: true, name: 'abs', arity: 1, impl: ([a]) => Math.abs(expectNum(a, 'ABS')) },
  min: { __builtin: true, name: 'min', arity: 2, impl: ([a, b]) => Math.min(expectNum(a, 'MIN'), expectNum(b, 'MIN')) },
  max: { __builtin: true, name: 'max', arity: 2, impl: ([a, b]) => Math.max(expectNum(a, 'MAX'), expectNum(b, 'MAX')) }
};

function expectNum(v: Value, ctx: string): number {
  if (!isNum(v)) throw new RuntimeError(0, `"${ctx}" só funciona com números.`);
  return v;
}

function clamp1(v: number): number {
  return Math.min(1, Math.max(-1, v));
}

class Env {
  constructor(
    public vars: Map<string, Value> = new Map(),
    public parent: Env | null = null
  ) {}

  get(name: string, line: number): Value {
    if (this.vars.has(name)) return this.vars.get(name) as Value;
    if (this.parent) return this.parent.get(name, line);
    throw new RuntimeError(line, `Não conheço "${name}" — crie antes com ${name} = valor, ou confira o nome do sensor.`);
  }

  /** Atribui onde a variável já existe (escopo), senão cria no global. */
  set(name: string, value: Value): void {
    let env: Env | null = this;
    while (env) {
      if (env.vars.has(name)) {
        env.vars.set(name, value);
        return;
      }
      env = env.parent;
    }
    // nova: cria no global (persiste entre ciclos — memória do robô!)
    let root: Env = this;
    while (root.parent) root = root.parent;
    root.vars.set(name, value);
  }

  define(name: string, value: Value): void {
    this.vars.set(name, value);
  }
}

/**
 * Intérprete por árvore (tree-walk). Cada `run()` = 1 ciclo:
 * foto dos sensores → executa o programa com combustível → ações saem
 * na hora pelo hardware. Variáveis do aluno sobrevivem entre ciclos.
 */
export class Interpreter {
  private globals = new Env();
  private fuel = 0;

  /** Limpa a memória do aluno (recomeçar). */
  reset(): void {
    this.globals = new Env();
  }

  run(program: Stmt[], hw: Hardware, fuel = 5000): { ok: boolean; error?: HppError; steps: number } {
    this.fuel = fuel;
    let steps = 0;
    try {
      // Foto dos sensores (somente leitura neste ciclo). `for-in` em vez de
      // `Object.entries`: evita 1 array + N pares por ciclo (GC); o snapshot
      // é objeto literal novo, então a enumeração é equivalente.
      const snap = hw.sensors();
      for (const k in snap) {
        this.globals.define(k.toLowerCase(), snap[k] as Value);
      }
      for (const s of program) {
        this.execStmt(s, this.globals, hw);
        steps++;
      }
      return { ok: true, steps };
    } catch (e) {
      if (e instanceof RuntimeError) {
        return { ok: false, error: { line: e.line, col: 1, message: e.message }, steps };
      }
      if (e instanceof ReturnSignal) {
        return { ok: false, error: { line: 1, col: 1, message: 'RETORNAR só pode ser usado dentro de FUNCAO.' }, steps };
      }
      throw e;
    }
  }

  private burn(line: number): void {
    if (--this.fuel <= 0) {
      throw new RuntimeError(
        line,
        'Seu programa cansou (passou do limite do ciclo)! Dica: troque ENQUANTO infinito por SEMPRE … FIM, que roda um pouco a cada ciclo.'
      );
    }
  }

  // ---- comandos ----

  private execStmt(s: Stmt, env: Env, hw: Hardware): void {
    this.burn(s.line);
    switch (s.kind) {
      case 'assign': {
        const v = this.evalExpr(s.expr, env, hw);
        if (v !== undefined && (typeof v === 'object' && v !== null && '__fn' in (v as object))) {
          throw new RuntimeError(s.line, 'Não dá para guardar função em variável (ainda). Chame direto: nome().');
        }
        env.set(s.name, v);
        return;
      }
      case 'expr':
        this.evalExpr(s.expr, env, hw);
        return;
      case 'action':
        this.execAction(s.name, s.args.map((a) => this.evalExpr(a, env, hw)), s.line, hw);
        return;
      case 'if': {
        const c = this.evalExpr(s.cond, env, hw);
        const branch = truthy(c) ? s.then : s.otherwise;
        for (const b of branch) this.execStmt(b, env, hw);
        return;
      }
      case 'while': {
        let guard = 0;
        while (truthy(this.evalExpr(s.cond, env, hw))) {
          if (++guard > 100000) throw new RuntimeError(s.line, 'ENQUANTO rodou demais neste ciclo.');
          for (const b of s.body) this.execStmt(b, env, hw);
        }
        return;
      }
      case 'repeat': {
        const n = this.evalExpr(s.count, env, hw);
        if (!isNum(n)) throw new RuntimeError(s.line, 'REPETIR precisa de número. Ex.: REPETIR 3 VEZES … FIM');
        const times = Math.max(0, Math.floor(n));
        for (let i = 0; i < times; i++) {
          for (const b of s.body) this.execStmt(b, env, hw);
        }
        return;
      }
      case 'for': {
        const from = this.evalExpr(s.from, env, hw);
        const to = this.evalExpr(s.to, env, hw);
        if (!isNum(from) || !isNum(to)) {
          throw new RuntimeError(s.line, 'PARA precisa de números. Ex.: PARA i DE 1 ATE 5 … FIM');
        }
        let step = 1;
        if (s.step) {
          const st = this.evalExpr(s.step, env, hw);
          if (!isNum(st) || st === 0) throw new RuntimeError(s.line, 'PASSO precisa ser número diferente de 0.');
          step = st;
        }
        const frame = new Env(new Map(), env);
        if (step > 0) {
          for (let i = from; i <= to; i += step) {
            frame.define(s.name, i);
            for (const b of s.body) this.execStmt(b, frame, hw);
          }
        } else {
          for (let i = from; i >= to; i += step) {
            frame.define(s.name, i);
            for (const b of s.body) this.execStmt(b, frame, hw);
          }
        }
        return;
      }
      case 'func':
        env.define(s.name, { __fn: true, name: s.name, params: s.params, body: s.body });
        return;
      case 'return':
        throw new ReturnSignal(s.expr ? this.evalExpr(s.expr, env, hw) : 0);
      case 'always':
        for (const b of s.body) this.execStmt(b, env, hw);
        return;
    }
  }

  private execAction(
    name: 'drive' | 'turn' | 'kick' | 'stop' | 'aimBall' | 'aimGoal' | 'radioSend' | 'dribble',
    args: Value[],
    line: number,
    hw: Hardware
  ): void {
    const num = (v: Value, cmd: string): number => {
      if (!isNum(v)) throw new RuntimeError(line, `"${cmd}" precisa de número entre -1 e 1. Ex.: ${cmd} 0.5`);
      return clamp1(v);
    };
    switch (name) {
      case 'drive':
        hw.drive(num(args[0], 'ANDAR'));
        return;
      case 'turn':
        hw.turn(num(args[0], 'GIRAR'));
        return;
      case 'kick':
        hw.fire();
        return;
      case 'stop':
        hw.stop();
        return;
      case 'aimBall':
        hw.aimMain();
        return;
      case 'aimGoal':
        hw.aimSecondary();
        return;
      case 'radioSend':
        if (!isNum(args[0])) throw new RuntimeError(line, `"ENVIAR_RADIO" precisa de um número.`);
        hw.radioSend(args[0]);
        return;
      case 'dribble':
        if (!isNum(args[0])) throw new RuntimeError(line, `"DRIBLAR" precisa de número: 0 desliga, outro valor liga.`);
        hw.dribble(args[0] !== 0);
        return;
    }
  }

  // ---- contas ----

  private evalExpr(e: Expr, env: Env, hw: Hardware): Value {
    this.burn(e.line);
    switch (e.kind) {
      case 'num':
      case 'str':
      case 'bool':
        return e.value;
      case 'var':
        return env.get(e.name, e.line);
      case 'unary': {
        const v = this.evalExpr(e.expr, env, hw);
        if (e.op === '-') {
          if (!isNum(v)) throw new RuntimeError(e.line, 'Sinal de menos só funciona com número.');
          return -v;
        }
        return !truthy(v);
      }
      case 'binary':
        return this.evalBinary(e.op, e.left, e.right, env, hw, e.line);
      case 'call': {
        const args = e.args.map((a) => this.evalExpr(a, env, hw));
        const builtin = BUILTINS[e.name];
        if (builtin) {
          if (args.length !== builtin.arity) {
            throw new RuntimeError(e.line, `"${e.name.toUpperCase()}" precisa de ${builtin.arity} número(s).`);
          }
          try {
            return builtin.impl(args);
          } catch (err) {
            if (err instanceof RuntimeError && err.line === 0) throw new RuntimeError(e.line, err.message);
            throw err;
          }
        }
        let fn: Value;
        try {
          fn = env.get(e.name, e.line);
        } catch {
          throw new RuntimeError(e.line, `Não conheço "${e.name}" — é FUNCAO, sensor ou variável?`);
        }
        if (typeof fn !== 'object' || fn === null || !('__fn' in fn)) {
          throw new RuntimeError(e.line, `"${e.name}" não é uma FUNCAO que dá para chamar.`);
        }
        const f = fn as HppFunction;
        if (args.length !== f.params.length) {
          throw new RuntimeError(
            e.line,
            `"${e.name}" espera ${f.params.length} valor(es), mas recebeu ${args.length}.`
          );
        }
        const frame = new Env(new Map(), this.globals);
        f.params.forEach((p, i) => frame.define(p, args[i]));
        try {
          for (const b of f.body) this.execStmt(b, frame, hw);
        } catch (err) {
          if (err instanceof ReturnSignal) return err.value;
          throw err;
        }
        return 0;
      }
    }
  }

  private evalBinary(op: string, l: Expr, r: Expr, env: Env, hw: Hardware, line: number): Value {
    // E/OU com curto-circuito
    if (op === 'AND') {
      const lv = this.evalExpr(l, env, hw);
      if (!truthy(lv)) return false;
      return truthy(this.evalExpr(r, env, hw));
    }
    if (op === 'OR') {
      const lv = this.evalExpr(l, env, hw);
      if (truthy(lv)) return true;
      return truthy(this.evalExpr(r, env, hw));
    }
    const lv = this.evalExpr(l, env, hw);
    const rv = this.evalExpr(r, env, hw);
    switch (op) {
      case '+':
        if (typeof lv === 'string' || typeof rv === 'string') return String(lv) + String(rv);
        if (isNum(lv) && isNum(rv)) return lv + rv;
        throw new RuntimeError(line, 'Só dá para somar número com número (ou juntar textos).');
      case '-':
      case '*':
      case '/':
      case '%':
      case '^': {
        if (!isNum(lv) || !isNum(rv)) {
          throw new RuntimeError(line, 'Conta só funciona com números.');
        }
        if (op === '-') return lv - rv;
        if (op === '*') return lv * rv;
        if (op === '/') {
          if (rv === 0) throw new RuntimeError(line, 'Divisão por zero não vale!');
          return lv / rv;
        }
        if (op === '%') return lv % rv;
        return Math.pow(lv, rv);
      }
      case '==':
        return lv === rv;
      case '!=':
        return lv !== rv;
      case '<':
      case '<=':
      case '>':
      case '>=': {
        if ((typeof lv === 'string' || typeof rv === 'string') && !(typeof lv === 'string' && typeof rv === 'string')) {
          throw new RuntimeError(line, 'Comparação de ordem só com números (ou texto com texto).');
        }
        if (op === '<') return (lv as number) < (rv as number);
        if (op === '<=') return (lv as number) <= (rv as number);
        if (op === '>') return (lv as number) > (rv as number);
        return (lv as number) >= (rv as number);
      }
      default:
        throw new RuntimeError(line, `Operação "${op}" desconhecida.`);
    }
  }
}
