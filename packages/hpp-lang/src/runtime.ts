import { Hardware, SensorValue } from './hardware.js';
import { Program } from './index.js';
import { HPP_CORE_VERSION, VersionInfo } from './version.js';
import { Capability, checkRequirements, missingCapabilitiesMessage } from './capabilities.js';
import { HppError } from './interpreter.js';

/**
 * HppRuntime (§7): camada entre o interpretador e o adapter do robô.
 * É um `Hardware` (o interpretador não muda), mas agrega:
 * - `ciclo`: contador de ticks (relógio determinístico do núcleo);
 * - capacidades do hardware + checagem didática (`exigir(...)`);
 * - informação de versão (core + extensão ativa).
 *
 * Arquitetura:
 * ```text
 * H++ Source → Lexer → Parser → AST → Interpreter → HppRuntime → Adapter → Robô
 * ```
 */
export class HppRuntime implements Hardware {
  /** Ciclos executados desde `reset()` (relógio do núcleo). */
  ciclo = 0;

  /**
   * Segundos por ciclo do relógio determinístico (§6/§28).
   * Os comandos temporais (ANDAR_POR/ESPERAR/…) contam com este `dt` —
   * nunca com `Date.now()`, `sleep`, `setTimeout` ou `await`.
   */
  dt = 1 / 120;

  constructor(
    private hw: Hardware,
    private capabilities: Capability[] = [],
    private extensionId = 'generic',
    private extensionVersion = '0.0.0'
  ) {}

  /** Foto dos sensores + `ciclo` do núcleo (sempre disponível). */
  sensors(): Record<string, SensorValue> {
    // Sem spread: `hw.sensors()` já devolve objeto novo por chamada, então
    // carimbar `ciclo` nele evita 1 alocação por robô por ciclo (GC).
    const s = this.hw.sensors();
    s.ciclo = this.ciclo;
    s.cycle = this.ciclo;
    return s;
  }

  drive(throttle: number): void {
    this.hw.drive(throttle);
  }

  turn(steer: number): void {
    this.hw.turn(steer);
  }

  fire(): void {
    this.hw.fire();
  }

  stop(): void {
    this.hw.stop();
  }

  aimMain(): void {
    this.hw.aimMain();
  }

  aimSecondary(): void {
    this.hw.aimSecondary();
  }

  radioSend(msg: number): void {
    this.hw.radioSend(msg);
  }

  dribble(on: boolean): void {
    this.hw.dribble(on);
  }

  /**
   * Comandos de motor/movimento avançado: só existem se o adapter por baixo
   * os implementar. O getter devolve `undefined` quando não há — assim o
   * intérprete acusa com mensagem didática em vez de estourar TypeError.
   */
  get motor(): Hardware['motor'] {
    return this.hw.motor ? this.hw.motor.bind(this.hw) : undefined;
  }

  get motorLeft(): Hardware['motorLeft'] {
    return this.hw.motorLeft ? this.hw.motorLeft.bind(this.hw) : undefined;
  }

  get motorRight(): Hardware['motorRight'] {
    return this.hw.motorRight ? this.hw.motorRight.bind(this.hw) : undefined;
  }

  get motors(): Hardware['motors'] {
    return this.hw.motors ? this.hw.motors.bind(this.hw) : undefined;
  }

  get moveLateral(): Hardware['moveLateral'] {
    return this.hw.moveLateral ? this.hw.moveLateral.bind(this.hw) : undefined;
  }

  get moveXY(): Hardware['moveXY'] {
    return this.hw.moveXY ? this.hw.moveXY.bind(this.hw) : undefined;
  }

  /** Versões separadas: core ≠ extensão (§17). */
  versions(): VersionInfo {
    return { core: HPP_CORE_VERSION, extension: this.extensionVersion, extensionId: this.extensionId };
  }

  /** Capacidades declaradas por este hardware. */
  getCapabilities(): Capability[] {
    return [...this.capabilities];
  }

  /**
   * Garante capacidades antes de agir; retorna mensagem PT ou null se OK.
   * Programas/ferramentas usam para explicar "por que não funciona aqui".
   */
  exigir(...need: Capability[]): string | null {
    const missing = checkRequirements(this.capabilities, need);
    return missing.length > 0 ? missingCapabilitiesMessage(missing, this.extensionId) : null;
  }

  /**
   * Executa 1 ciclo do programa sobre este runtime.
   *
   * Sempre envia as capabilities + `dt` para o intérprete (§21/§28):
   * é o gate que barra uma ação de movimento em robô que não a suporta,
   * com a mesma mensagem PT da checagem em tempo de compilação.
   * Passe `caps: null` explicitamente para rodar o núcleo "puro", sem gate.
   */
  runProgram(
    program: Program,
    fuel = 5000,
    opts: { capabilities?: Capability[] | null; dt?: number } = {}
  ): { ok: boolean; error?: HppError; steps: number; suspended?: boolean } {
    const caps = opts.capabilities === undefined ? this.capabilities : opts.capabilities;
    const r = program.run(this, fuel, { capabilities: caps, dt: opts.dt ?? this.dt });
    this.ciclo++;
    return r;
  }

  reset(): void {
    this.ciclo = 0;
  }
}
