import { Expr, Stmt } from './ast.js';
import { Hardware, SensorValue } from './hardware.js';
import type { Capability } from './capabilities.js';
import { ACTION_PT, type ActionName } from './tokens.js';
import {
  MotionState,
  motionCapabilityError,
  ENCODER_SENSORS,
  HEADING_SENSORS,
  type TimedPending,
  type SpatialPending
} from './robotics/motion.js';

import { HppError, RuntimeError } from './errors.js';

export type { HppError } from './errors.js';
export { RuntimeError } from './errors.js';

/**
 * Opções de execução fornecidas pelo `HppRuntime` (§7/§28).
 * Sem elas o Core roda "puro", sem checagem de capability — é o caminho
 * dos testes de núcleo; o runtime sempre envia as duas.
 */
export interface RunOptions {
  /**
   * Capacidades declaradas pelo hardware (habilita a checagem em runtime).
   * `null` (ou omitido) = núcleo puro, sem gate de capability.
   */
  capabilities?: Capability[] | null;
  /** Segundos por ciclo do relógio determinístico (nunca `Date.now()`). */
  dt?: number;
}

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

/** Resultado de 1 ciclo. `suspended` = temporal em andamento (§6). */
export interface RunResult {
  ok: boolean;
  error?: HppError;
  steps: number;
  suspended?: boolean;
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

/** Diferença angular em graus, normalizada para -180..180. */
function normDeg(d: number): number {
  let x = d;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
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
 * foto dos sensores → (avalia o relógio do movimento) → executa o programa
 * com combustível → ações saem na hora pelo hardware. Variáveis do aluno
 * sobrevivem entre ciclos.
 *
 * **Movimentos temporais (§6)** tornam o programa um gerador: ao encontrar
 * `ANDAR_POR`/`ESPERAR` o interpretador SUSPENDE a execução e guarda o
 * ponto exato (dentro de `SE`, `REPETIR`, função…). Nos ciclos seguintes ele
 * só soma `dt` no relógio — quando o tempo vence, conclui o movimento e
 * RETOMA de onde parou. Nada bloqueia: `sleep`/`setTimeout`/`await` não
 * existem aqui.
 */
export class Interpreter {
  private globals = new Env();
  private fuel = 0;
  /** Execução suspensa entre ciclos (null = programa parou no topo). */
  private gen: Generator<void, void, void> | null = null;
  private motion = new MotionState();
  private caps: Capability[] | null = null;
  private dt = 1 / 120;
  /** Linha do movimento em curso (p/ erros de sensor ausente). */
  private pendingLine = 1;
  private steps = 0;
  private snapshot: Record<string, SensorValue> = {};

  /** Limpa a memória do aluno e a execução em curso (recomeçar). */
  reset(): void {
    this.globals = new Env();
    this.gen = null;
    this.motion.reset();
  }

  run(program: Stmt[], hw: Hardware, fuel = 5000, opts?: RunOptions): RunResult {
    this.fuel = fuel;
    this.caps = opts?.capabilities ?? null;
    this.dt = typeof opts?.dt === 'number' && opts.dt > 0 ? opts.dt : 1 / 120;
    this.steps = 0;
    try {
      // Foto dos sensores (somente leitura neste ciclo). `for-in` em vez de
      // `Object.entries`: evita 1 array + N pares por ciclo (GC); o snapshot
      // é objeto literal novo, então a enumeração é equivalente.
      const snap = hw.sensors();
      this.snapshot = snap;
      for (const k in snap) {
        this.globals.define(k.toLowerCase(), snap[k] as Value);
      }
      this.motion.justCompleted = false;

      // Relógio do movimento temporal/espacial (§6/§8) — feito ANTES de
      // retomar o programa, para `movimento_concluido` valer neste ciclo.
      if (this.motion.pending) {
        const p = this.motion.pending;
        if (p.mode === 'timed') {
          const finished = this.motion.tickTimed(this.dt);
          if (this.motion.pending) {
            this.injectMotionState();
            return { ok: true, steps: this.steps, suspended: true };
          }
          if (finished) this.finishTimed(finished, hw);
        } else {
          const done = this.advanceSpatial(p, hw);
          if (this.motion.pending) {
            this.injectMotionState();
            return { ok: true, steps: this.steps, suspended: true };
          }
          if (done) {
            hw.stop();
            this.motion.noteStopped();
          }
        }
      }

      this.injectMotionState();

      if (!this.gen) this.gen = this.execList(program, this.globals, hw);
      const r = this.gen.next();
      if (r.done) this.gen = null;
      return { ok: true, steps: this.steps, suspended: !r.done };
    } catch (e) {
      // Erro fatal do ciclo: solta a execução; o próximo ciclo recomeça
      // do topo (e o chamador trava a mensagem até novo código).
      this.gen = null;
      this.motion.reset();
      if (e instanceof RuntimeError) {
        return { ok: false, error: { line: e.line, col: 1, message: e.message }, steps: this.steps };
      }
      if (e instanceof ReturnSignal) {
        return {
          ok: false,
          error: { line: 1, col: 1, message: 'RETORNAR só pode ser usado dentro de FUNCAO.' },
          steps: this.steps
        };
      }
      throw e;
    }
  }

  /** Sensores genéricos de estado de movimento (§14). */
  private injectMotionState(): void {
    const m = this.motion;
    const g = this.globals;
    const driving = m.isDriving();
    const stopped = m.isStopped();
    const turning = m.isTurning();
    const active = m.pending !== null || !m.isStopped();
    g.define('esta_andando', driving);
    g.define('is_moving', driving);
    g.define('esta_parado', stopped);
    g.define('is_stopped', stopped);
    g.define('esta_girando', turning);
    g.define('is_turning', turning);
    g.define('movimento_ativo', active);
    g.define('motion_active', active);
    g.define('movimento_concluido', m.justCompleted);
    g.define('motion_done', m.justCompleted);
  }

  /** Conclusão de um temporal: para o robô (§6 — "executar PARAR"). */
  private finishTimed(p: TimedPending, hw: Hardware): void {
    if (p.kind === 'drive' || p.kind === 'reverse' || p.kind === 'turn') {
      hw.stop();
      this.motion.noteStopped();
    }
  }

  /** Lê um sensor numérico do snapshot atual, na ordem de preferência. */
  private readSensorNum(names: readonly string[]): number | null {
    for (const n of names) {
      const v = this.snapshot[n];
      if (typeof v === 'number') return v;
    }
    return null;
  }

  /**
   * Avalia a meta de um comando espacial. `true` = meta atingida.
   * Sem leitura real o movimento é ABORTADO com erro — o H++ nunca finge
   * que uma distância/ângulo foi alcançado (§8).
   */
  private advanceSpatial(p: SpatialPending, _hw: Hardware): boolean {
    const reading = this.readSensorNum(p.sensors);
    if (reading === null) {
      this.motion.abortSpatial();
      const what = p.kind === 'distance' ? 'distância' : 'ângulo';
      throw new RuntimeError(
        this.pendingLine,
        `"${p.label}" precisa do sensor ${p.sensors.map((s) => `"${s}"`).join(' ou ')} ` +
          `para medir a ${what}. Sem odometria real o H++ não finge que chegou.`
      );
    }
    if (p.kind === 'distance') {
      p.accum = Math.abs(reading - p.start);
    } else {
      p.accum += Math.abs(normDeg(reading - p.prev));
      p.prev = reading;
    }
    if (p.accum + 1e-9 >= p.target) {
      this.motion.finishSpatial();
      return true;
    }
    return false;
  }

  private burn(line: number): void {
    if (--this.fuel <= 0) {
      throw new RuntimeError(
        line,
        'Seu programa cansou (passou do limite do ciclo)! Dica: troque ENQUANTO infinito por SEMPRE … FIM, que roda um pouco a cada ciclo.'
      );
    }
  }

  // ---- comandos (geradores: podem suspender o programa) ----

  private *execList(list: Stmt[], env: Env, hw: Hardware): Generator<void, void, void> {
    for (const s of list) yield* this.execStmt(s, env, hw);
  }

  private *execStmt(s: Stmt, env: Env, hw: Hardware): Generator<void, void, void> {
    this.burn(s.line);
    this.steps++;
    switch (s.kind) {
      case 'assign': {
        const v = yield* this.evalExpr(s.expr, env, hw);
        if (v !== undefined && (typeof v === 'object' && v !== null && '__fn' in (v as object))) {
          throw new RuntimeError(s.line, 'Não dá para guardar função em variável (ainda). Chame direto: nome().');
        }
        env.set(s.name, v);
        return;
      }
      case 'expr':
        yield* this.evalExpr(s.expr, env, hw);
        return;
      case 'action': {
        const args: Value[] = [];
        for (const a of s.args) args.push(yield* this.evalExpr(a, env, hw));
        yield* this.execAction(s.name, args, s.line, hw);
        return;
      }
      case 'if': {
        const c = yield* this.evalExpr(s.cond, env, hw);
        const branch = truthy(c) ? s.then : s.otherwise;
        yield* this.execList(branch, env, hw);
        return;
      }
      case 'while': {
        let guard = 0;
        while (truthy(yield* this.evalExpr(s.cond, env, hw))) {
          if (++guard > 100000) throw new RuntimeError(s.line, 'ENQUANTO rodou demais neste ciclo.');
          yield* this.execList(s.body, env, hw);
        }
        return;
      }
      case 'repeat': {
        const n = yield* this.evalExpr(s.count, env, hw);
        if (!isNum(n)) throw new RuntimeError(s.line, 'REPETIR precisa de número. Ex.: REPETIR 3 VEZES … FIM');
        const times = Math.max(0, Math.floor(n));
        for (let i = 0; i < times; i++) {
          yield* this.execList(s.body, env, hw);
        }
        return;
      }
      case 'for': {
        const from = yield* this.evalExpr(s.from, env, hw);
        const to = yield* this.evalExpr(s.to, env, hw);
        if (!isNum(from) || !isNum(to)) {
          throw new RuntimeError(s.line, 'PARA precisa de números. Ex.: PARA i DE 1 ATE 5 … FIM');
        }
        let step = 1;
        if (s.step) {
          const st = yield* this.evalExpr(s.step, env, hw);
          if (!isNum(st) || st === 0) throw new RuntimeError(s.line, 'PASSO precisa ser número diferente de 0.');
          step = st;
        }
        const frame = new Env(new Map(), env);
        if (step > 0) {
          for (let i = from; i <= to; i += step) {
            frame.define(s.name, i);
            yield* this.execList(s.body, frame, hw);
          }
        } else {
          for (let i = from; i >= to; i += step) {
            frame.define(s.name, i);
            yield* this.execList(s.body, frame, hw);
          }
        }
        return;
      }
      case 'func':
        env.define(s.name, { __fn: true, name: s.name, params: s.params, body: s.body });
        return;
      case 'return': {
        const v = s.expr ? (yield* this.evalExpr(s.expr, env, hw)) : 0;
        throw new ReturnSignal(v);
      }
      case 'always':
        yield* this.execList(s.body, env, hw);
        return;
    }
  }

  private *execAction(name: ActionName, args: Value[], line: number, hw: Hardware): Generator<void, void, void> {
    // Checagem de capability em runtime (§21): só quando o chamador declarou
    // capabilities (HppRuntime sempre declara; núcleo puro não checa).
    if (this.caps) {
      const capErr = motionCapabilityError(name, this.caps);
      if (capErr) throw new RuntimeError(line, capErr);
    }
    const num = (v: Value, cmd: string): number => {
      if (!isNum(v)) throw new RuntimeError(line, `"${cmd}" precisa de número entre -1 e 1. Ex.: ${cmd} 0.5`);
      return clamp1(v);
    };
    const raw = (v: Value, cmd: string): number => {
      if (!isNum(v)) throw new RuntimeError(line, `"${cmd}" precisa de número. Ex.: ${cmd} 1`);
      return v;
    };
    const seconds = (v: Value, cmd: string): number => {
      const n = raw(v, cmd);
      if (n < 0) throw new RuntimeError(line, `"${cmd}" precisa de tempo maior ou igual a 0 (segundos).`);
      return n;
    };

    switch (name) {
      // ---- movimento básico ----
      case 'drive': {
        const v = num(args[0], 'ANDAR');
        hw.drive(v);
        this.motion.noteDrive(v);
        return;
      }
      case 'reverse': {
        const v = num(args[0], 'VOLTAR');
        hw.drive(-v); // semanticamente drive(-v): sem física duplicada (§5.2)
        this.motion.noteDrive(-v);
        return;
      }
      case 'stop':
        hw.stop();
        this.motion.noteStopped();
        return;
      case 'turn': {
        const v = num(args[0], 'GIRAR');
        hw.turn(v);
        this.motion.noteTurn(v);
        return;
      }
      case 'turnLeft': {
        const v = num(args[0], 'VIRAR_ESQUERDA');
        hw.turn(v); // convenção do projeto: GIRAR positivo = esquerda
        this.motion.noteTurn(v);
        return;
      }
      case 'turnRight': {
        const v = num(args[0], 'VIRAR_DIREITA');
        hw.turn(-v);
        this.motion.noteTurn(-v);
        return;
      }

      // ---- movimento temporal (não bloqueante) ----
      case 'driveFor': {
        const v = num(args[0], 'ANDAR_POR');
        const t = seconds(args[1], 'ANDAR_POR');
        if (t <= 0) return;
        hw.drive(v);
        this.motion.beginTimed('drive', v, t);
        this.pendingLine = line;
        yield;
        return;
      }
      case 'reverseFor': {
        const v = num(args[0], 'VOLTAR_POR');
        const t = seconds(args[1], 'VOLTAR_POR');
        if (t <= 0) return;
        hw.drive(-v);
        this.motion.beginTimed('reverse', -v, t);
        this.pendingLine = line;
        yield;
        return;
      }
      case 'turnFor': {
        const v = num(args[0], 'GIRAR_POR');
        const t = seconds(args[1], 'GIRAR_POR');
        if (t <= 0) return;
        hw.turn(v);
        this.motion.beginTimed('turn', v, t);
        this.pendingLine = line;
        yield;
        return;
      }
      case 'stopFor': {
        const t = seconds(args[0], 'PARAR_POR');
        hw.stop();
        this.motion.noteStopped();
        if (t <= 0) return;
        this.motion.beginTimed('stop', 0, t);
        this.pendingLine = line;
        yield;
        return;
      }
      case 'wait': {
        const t = seconds(args[0], 'ESPERAR');
        if (t <= 0) return;
        this.motion.beginTimed('wait', 0, t);
        this.pendingLine = line;
        yield;
        return;
      }

      // ---- movimento espacial (capability + leitura real) ----
      case 'driveMeters':
      case 'reverseMeters': {
        const label = ACTION_PT[name];
        const meters = raw(args[0], label);
        if (meters < 0) {
          throw new RuntimeError(line, `"${label}" precisa de distância maior ou igual a 0 (metros).`);
        }
        const encoder = this.readSensorNum(ENCODER_SENSORS);
        if (encoder === null) {
          throw new RuntimeError(
            line,
            `"${label}" precisa do sensor ${ENCODER_SENSORS.map((s) => `"${s}"`).join(' ou ')} ` +
              'para medir a distância. Sem odometria real o H++ não finge que chegou.'
          );
        }
        if (meters === 0) return;
        const forward = name === 'driveMeters';
        const drive = forward ? 1 : -1;
        hw.drive(drive);
        this.motion.noteDrive(drive);
        this.motion.beginSpatial({
          action: name,
          label,
          sensors: [...ENCODER_SENSORS],
          kind: 'distance',
          start: encoder,
          prev: encoder,
          accum: 0,
          target: meters,
          drive,
          turn: 0
        });
        this.pendingLine = line;
        yield;
        return;
      }
      case 'turnDegrees': {
        const label = ACTION_PT.turnDegrees;
        const deg = raw(args[0], label);
        const heading = this.readSensorNum(HEADING_SENSORS);
        if (heading === null) {
          throw new RuntimeError(
            line,
            `"${label}" precisa do sensor ${HEADING_SENSORS.map((s) => `"${s}"`).join(' ou ')} ` +
              'para saber quando parou de girar. Sem bússola real o H++ não finge que chegou.'
          );
        }
        const target = Math.abs(deg);
        if (target === 0) return;
        const steer = deg > 0 ? 1 : -1;
        hw.turn(steer);
        this.motion.noteTurn(steer);
        this.motion.beginSpatial({
          action: name,
          label,
          sensors: [...HEADING_SENSORS],
          kind: 'degrees',
          start: heading,
          prev: heading,
          accum: 0,
          target,
          drive: 0,
          turn: steer
        });
        this.pendingLine = line;
        yield;
        return;
      }

      // ---- controle de motores (capability obrigatória) ----
      case 'motor': {
        const id = Math.max(0, Math.floor(raw(args[0], 'MOTOR')));
        const v = num(args[1], 'MOTOR');
        if (!hw.motor) throw new RuntimeError(line, '"MOTOR" não está implementado neste hardware.');
        hw.motor(id, v);
        return;
      }
      case 'motorLeft': {
        const v = num(args[0], 'MOTOR_ESQUERDO');
        if (!hw.motorLeft) {
          throw new RuntimeError(line, '"MOTOR_ESQUERDO" não está implementado neste hardware.');
        }
        hw.motorLeft(v);
        this.motion.noteMotorLeft(v);
        return;
      }
      case 'motorRight': {
        const v = num(args[0], 'MOTOR_DIREITO');
        if (!hw.motorRight) {
          throw new RuntimeError(line, '"MOTOR_DIREITO" não está implementado neste hardware.');
        }
        hw.motorRight(v);
        this.motion.noteMotorRight(v);
        return;
      }
      case 'motors': {
        const l = num(args[0], 'MOTORES');
        const r = num(args[1], 'MOTORES');
        if (!hw.motors) throw new RuntimeError(line, '"MOTORES" não está implementado neste hardware.');
        hw.motors(l, r);
        this.motion.noteMotors(l, r);
        return;
      }

      // ---- movimento avançado ----
      case 'curve': {
        const v = num(args[0], 'CURVA');
        const d = num(args[1], 'CURVA');
        // throttle + steer: a mesma física de ANDAR/GIRAR, sem duplicar (§13)
        hw.drive(v);
        hw.turn(d);
        this.motion.noteDrive(v);
        this.motion.noteTurn(d);
        return;
      }
      case 'moveLateral': {
        const v = num(args[0], 'MOVER_LATERAL');
        if (!hw.moveLateral) {
          throw new RuntimeError(line, '"MOVER_LATERAL" não está implementado neste hardware.');
        }
        hw.moveLateral(v);
        this.motion.noteLateral(v);
        return;
      }
      case 'moveXY': {
        const vx = num(args[0], 'MOVER_XY');
        const vy = num(args[1], 'MOVER_XY');
        if (!hw.moveXY) throw new RuntimeError(line, '"MOVER_XY" não está implementado neste hardware.');
        hw.moveXY(vx, vy);
        this.motion.noteDrive(vx);
        this.motion.noteLateral(vy);
        return;
      }

      // ---- domínio de extensão (§16 — continuam na extensão) ----
      case 'kick':
        hw.fire();
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

  private *evalExpr(e: Expr, env: Env, hw: Hardware): Generator<void, Value, void> {
    this.burn(e.line);
    switch (e.kind) {
      case 'num':
      case 'str':
      case 'bool':
        return e.value;
      case 'var':
        return env.get(e.name, e.line);
      case 'unary': {
        const v = yield* this.evalExpr(e.expr, env, hw);
        if (e.op === '-') {
          if (!isNum(v)) throw new RuntimeError(e.line, 'Sinal de menos só funciona com número.');
          return -v;
        }
        return !truthy(v);
      }
      case 'binary':
        return yield* this.evalBinary(e.op, e.left, e.right, env, hw, e.line);
      case 'call': {
        const args: Value[] = [];
        for (const a of e.args) args.push(yield* this.evalExpr(a, env, hw));
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
          yield* this.execList(f.body, frame, hw);
        } catch (err) {
          if (err instanceof ReturnSignal) return err.value;
          throw err;
        }
        return 0;
      }
    }
  }

  private *evalBinary(op: string, l: Expr, r: Expr, env: Env, hw: Hardware, line: number): Generator<void, Value, void> {
    // E/OU com curto-circuito
    if (op === 'AND') {
      const lv = yield* this.evalExpr(l, env, hw);
      if (!truthy(lv)) return false;
      return truthy(yield* this.evalExpr(r, env, hw));
    }
    if (op === 'OR') {
      const lv = yield* this.evalExpr(l, env, hw);
      if (truthy(lv)) return true;
      return truthy(yield* this.evalExpr(r, env, hw));
    }
    const lv = yield* this.evalExpr(l, env, hw);
    const rv = yield* this.evalExpr(r, env, hw);
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
