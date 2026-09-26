import { lex, type LexOptions } from './lexer.js';
import { Parser } from './parser.js';
import { Interpreter, RunOptions, RunResult } from './interpreter.js';
import type { HppError } from './errors.js';
import { Hardware } from './hardware.js';
import { Stmt } from './ast.js';

// Pipeline da linguagem (núcleo puro): Lexer → Parser → AST → Interpreter.
export { lex as Lexer, lex } from './lexer.js';
export { Parser } from './parser.js';
export { Interpreter } from './interpreter.js';
export type { Expr, Stmt } from './ast.js';
export type { Token, TokenType } from './tokens.js';
export type { HppError } from './errors.js';
export { RuntimeError } from './errors.js';
export type { HppError as InterpreterHppError } from './interpreter.js';
export type { Hardware, SensorValue } from './hardware.js';
export { HppRuntime } from './runtime.js';
export { HPP_CORE_VERSION } from './version.js';
export type { VersionInfo } from './version.js';
export type { Capability, ExtensionDescriptor } from './capabilities.js';
export { checkRequirements, missingCapabilitiesMessage, checkProgramActions, collectProgramActions, collectProgramSensors } from './capabilities.js';
export type { ActionSpec, ActionName } from './tokens.js';
export { stripAccents, type LexOptions } from './lexer.js';
export type { LexError } from './lexer.js';
export type { ParseError } from './parser.js';
// Camada robotics (genérica, sem domínio).
export type { SensorSnapshot } from './robotics/sensors.js';
export { normalizeSnapshotKeys } from './robotics/snapshot.js';
export { CANONICAL_ACTIONS, type CanonicalAction } from './robotics/actions.js';
export type { Value, HppFunction, Builtin } from './robotics/types.js';
/** Robotics Motion Primitives (§5–§14): contrato, ações e relógio do movimento. */
export {
  HPP_ROBOTICS_VERSION,
  MOTION_ACTIONS,
  MOTION_STATE_SENSORS,
  isMotionAction,
  missingMotionCapability,
  motionCapabilityError
} from './robotics/index.js';
export type {
  MotionAction,
  MotionCommand,
  MotionCapabilities,
  MotorCapabilities,
  EncoderCapabilities,
  LocomotionCapabilities,
  RoboticsProfile
} from './robotics/index.js';
export type { RunOptions, RunResult } from './interpreter.js';
// Extensões de domínio (soccer / line / maze).
export { SOCCER_EXTENSION, SOCCER_EXT_VERSION } from './extensions/soccer/index.js';
export { LINE_EXTENSION, LINE_EXT_VERSION, lineError, MockLineHardware } from './extensions/line/index.js';
export type { LineArrayReading, LineSensor, LineController } from './extensions/line/index.js';
export { MAZE_EXTENSION, MAZE_EXT_VERSION } from './extensions/maze/index.js';
export type { DistanceSensor, WallDetector, GridCell, MazeMap, Navigator } from './extensions/maze/index.js';

/** Programa compilado: rode `run(hardware)` uma vez por ciclo. */
export class Program {
  private interp = new Interpreter();

  constructor(readonly statements: Stmt[]) {}

  /**
   * Executa 1 ciclo. Variáveis do aluno sobrevivem entre chamadas.
   * `opts` (§7/§28): capabilities para checagem em runtime + `dt` do relógio
   * determinístico; sem `opts`, o núcleo roda "puro" (sem gate de capability).
   */
  run(hw: Hardware, fuel = 5000, opts?: RunOptions): RunResult {
    return this.interp.run(this.statements, hw, fuel, opts);
  }

  /** Apaga a memória do aluno (recomeçar do zero). */
  reset(): void {
    this.interp.reset();
  }
}

export interface CompileResult {
  program: Program | null;
  errors: HppError[];
}

/** Compila fonte H++ (PT/EN). Erros vêm com linha e dica em português. */
export function compile(source: string, opts?: { extraActions?: LexOptions['extraActions'] }): CompileResult {
  const { tokens, errors: lexErrors } = lex(source, opts ?? {});
  const errors: HppError[] = lexErrors.map((e) => ({ line: e.line, col: e.col, message: e.message }));
  if (errors.length > 0) return { program: null, errors };
  const parser = new Parser(tokens);
  const statements = parser.parse();
  for (const e of parser.errors) {
    errors.push({ line: e.line, col: e.col, message: e.message });
  }
  if (errors.length > 0 || statements.length === 0) {
    if (statements.length === 0 && errors.length === 0) {
      return { program: new Program([]), errors: [] };
    }
    return { program: null, errors };
  }
  return { program: new Program(statements), errors: [] };
}
