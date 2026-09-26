import type { Capability } from '../capabilities.js';
import type { ActionName } from '../tokens.js';
import { ACTION_PT } from '../tokens.js';
import type { MotionAction } from './contracts.js';

/**
 * Núcleo da camada **HPP Robotics Motion**: vocabulário compartilhado,
 * exigências de capability e a máquina de estados de movimento.
 *
 * Regras de ouro (§6/§28):
 * - nenhum `sleep`/`setTimeout`/`await`/busy-wait: o tempo vem do relógio
 *   determinístico do runtime (`dt` por ciclo);
 * - a operação temporal **sobrevive entre ciclos** (o programa é suspenso,
 *   não o runtime — o robô nunca congela o simulador);
 * - nunca fingir que uma distância/ângulo foi atingido: sem `encoder`/
 *   `odometry` (e sem a leitura real) o comando falha em português.
 */

/** Versão da camada Robotics (independente do Core e das extensões). */
export const HPP_ROBOTICS_VERSION = '0.1.0';

/** Todos os verbos de movimento universais (§33 — conjunto compartilhado). */
export const MOTION_ACTIONS: readonly MotionAction[] = [
  'drive', 'reverse', 'stop', 'turn', 'turnLeft', 'turnRight',
  'driveFor', 'reverseFor', 'turnFor', 'stopFor', 'wait',
  'driveMeters', 'reverseMeters', 'turnDegrees',
  'motor', 'motorLeft', 'motorRight', 'motors',
  'curve', 'moveLateral', 'moveXY'
];

const MOTION_SET = new Set<string>(MOTION_ACTIONS);

/** É uma primitiva de movimento Robotics (logo, vale em qualquer domínio)? */
export function isMotionAction(name: ActionName): boolean {
  return MOTION_SET.has(name);
}

/** Ações temporais: exigem o relógio do runtime e suspendem o programa. */
export const TIMED_ACTIONS: ReadonlySet<ActionName> = new Set<ActionName>([
  'driveFor', 'reverseFor', 'turnFor', 'stopFor', 'wait'
]);

/** Ações espaciais: distância/ângulo reais (nunca simulados). */
export const SPATIAL_ACTIONS: ReadonlySet<ActionName> = new Set<ActionName>([
  'driveMeters', 'reverseMeters', 'turnDegrees'
]);

/**
 * Capacidades exigidas por ação, com semântica **"basta uma delas" (OU)**.
 * Escolhemos OU porque um hardware pode oferecer `encoder` puro ou
 * `odometry` completa — o programa não deve saber qual adapter está por
 * baixo. Ações de domínio (kick/dribble/radio…) ficam no `requires` da
 * própria extensão; aqui mora só o que é compartilhado por todo robô.
 */
export const MOTION_REQUIREMENTS: Readonly<Partial<Record<MotionAction, Capability[]>>> = {
  driveMeters: ['encoder', 'odometry'],
  reverseMeters: ['encoder', 'odometry'],
  turnDegrees: ['encoder', 'odometry', 'compass', 'imu'],
  motor: ['motor_individual'],
  motorLeft: ['motor_left'],
  motorRight: ['motor_right'],
  motors: ['differential_drive'],
  curve: ['motor'],
  moveLateral: ['holonomic_drive'],
  moveXY: ['holonomic_drive']
};

/** Capacidades (OU) que faltam para `action`, ou null se pode executar. */
export function missingMotionCapability(action: ActionName, have: Capability[]): Capability[] | null {
  if (!isMotionAction(action)) return null;
  const need = MOTION_REQUIREMENTS[action as MotionAction];
  if (!need || need.length === 0) return null;
  return need.some((c) => have.includes(c)) ? null : [...need];
}

/**
 * Mensagem didática em português quando falta capability (§21).
 * Retorna null quando a ação pode executar neste hardware.
 */
export function motionCapabilityError(action: ActionName, have: Capability[]): string | null {
  const missing = missingMotionCapability(action, have);
  if (!missing) return null;
  const label = ACTION_PT[action] ?? String(action);
  return (
    `A ação ${label} requer a capacidade ${missing.join(' ou ')}. ` +
    `Este robô não possui essa capacidade.`
  );
}

/**
 * Sensores genéricos de estado de movimento (§14). O interpretador os injeta
 * a cada ciclo; `velocidade`/`velocidade_angular` vêm do adapter quando o
 * hardware os suporta (nunca inventados pelo Core).
 */
export const MOTION_STATE_SENSORS: readonly string[] = [
  'esta_andando', 'is_moving',
  'esta_parado', 'is_stopped',
  'esta_girando', 'is_turning',
  'movimento_ativo', 'motion_active',
  'movimento_concluido', 'motion_done'
];

/** Sensores de odometria aceitos pelos comandos por distância. */
export const ENCODER_SENSORS: readonly string[] = ['encoder', 'odometria', 'odometry'];

/** Sensores de orientação aceitos pelo `GIRAR_GRAUS`. */
export const HEADING_SENSORS: readonly string[] = ['bussola', 'compass'];

/** Tipo do movimento temporal em andamento. */
export type TimedKind = 'drive' | 'reverse' | 'turn' | 'stop' | 'wait';

/** Estado de um comando temporal (§6 — sobrevive entre ciclos). */
export interface TimedPending {
  mode: 'timed';
  kind: TimedKind;
  /** Parâmetro normalizado -1..1 (0 para `stop`/`wait`). */
  value: number;
  /** Segundos totais. */
  duration: number;
  /** Segundos já decorridos (soma de `dt` a cada ciclo). */
  elapsed: number;
}

/** Estado de um comando espacial (§8 — distância/ângulo reais). */
export interface SpatialPending {
  mode: 'spatial';
  action: MotionAction;
  /** Rótulo PT do comando (mensagens). */
  label: string;
  /** Sensores candidatos, em ordem de preferência. */
  sensors: string[];
  kind: 'distance' | 'degrees';
  /** Leitura inicial no momento do comando. */
  start: number;
  /** Leitura do ciclo anterior (para acumular giros > 180°). */
  prev: number;
  /** Acumulado até agora (metros ou graus, sempre ≥ 0). */
  accum: number;
  /** Valor absoluto a percorrer. */
  target: number;
  /** Velocidade comandada (-1..1) enquanto percorre. */
  drive: number;
  /** Steer comandado (-1..1) enquanto gira. */
  turn: number;
}

export type PendingMotion = TimedPending | SpatialPending;

/**
 * Máquina de estados do movimento, mantida **entre ciclos** pelo
 * interpretador. Registra o último comando contínuo para alimentar os
 * sensores `esta_andando`/`esta_parado`/`esta_girando`.
 *
 * Os valores são **leitura de comando**, não física do robô: o Core não
 * calcula cinemática (isso é trabalho do adapter).
 */
export class MotionState {
  /** Comando em andamento (null = programa executando solto). */
  pending: PendingMotion | null = null;
  /** Verdadeiro só no ciclo em que um movimento terminou. */
  justCompleted = false;
  /** Último avanço comandado (-1..1; 0 = parado). */
  driveValue = 0;
  /** Último giro comandado (-1..1; 0 = sem giro). */
  turnValue = 0;
  /** Última velocidade da roda individual esquerda (-1..1). */
  leftValue = 0;
  /** Última velocidade da roda individual direita (-1..1). */
  rightValue = 0;
  /** Último deslocamento lateral holonômico (-1..1). */
  lateralValue = 0;

  /** Inicia um movimento temporal (o comando já foi enviado ao hardware). */
  beginTimed(kind: TimedKind, value: number, duration: number): void {
    this.pending = { mode: 'timed', kind, value, duration: Math.max(0, duration), elapsed: 0 };
    if (kind === 'drive' || kind === 'reverse') this.driveValue = value;
    else if (kind === 'turn') this.turnValue = value;
    else if (kind === 'stop') this.noteStopped();
  }

  /** Inicia um movimento por distância/ângulo. */
  beginSpatial(spec: Omit<SpatialPending, 'mode'>): void {
    this.pending = { ...spec, mode: 'spatial' };
    this.driveValue = spec.drive;
    this.turnValue = spec.turn;
    this.leftValue = 0;
    this.rightValue = 0;
    this.lateralValue = 0;
  }

  /**
   * Avança o relógio de um movimento TEMPORAL. Devolve o que terminou neste
   * tick (ou null). Nunca bloqueia: apenas soma `dt`.
   */
  tickTimed(dt: number): TimedPending | null {
    const p = this.pending;
    if (!p || p.mode !== 'timed') return null;
    p.elapsed += dt;
    if (p.elapsed + 1e-9 < p.duration) return null;
    this.pending = null;
    this.justCompleted = true;
    return p;
  }

  /** Conclui o movimento espacial atual (meta de distância/ângulo atingida). */
  finishSpatial(): void {
    if (this.pending?.mode !== 'spatial') return;
    this.pending = null;
    this.justCompleted = true;
  }

  /** Desiste do movimento espacial (sensor ausente) sem fingir chegada. */
  abortSpatial(): void {
    if (this.pending?.mode !== 'spatial') return;
    this.pending = null;
  }

  noteDrive(value: number): void {
    this.driveValue = value;
  }

  noteTurn(value: number): void {
    this.turnValue = value;
  }

  noteMotorLeft(value: number): void {
    this.leftValue = value;
  }

  noteMotorRight(value: number): void {
    this.rightValue = value;
  }

  noteMotors(left: number, right: number): void {
    this.leftValue = left;
    this.rightValue = right;
  }

  noteLateral(value: number): void {
    this.lateralValue = value;
  }

  noteStopped(): void {
    this.driveValue = 0;
    this.turnValue = 0;
    this.leftValue = 0;
    this.rightValue = 0;
    this.lateralValue = 0;
  }

  /**
   * Avanço comandado diferente de zero (qualquer sinal: `VOLTAR -0.5` e
   * `ANDAR -0.5` são andar para trás — continuam "andando").
   */
  isDriving(): boolean {
    return this.driveValue !== 0 || this.leftValue !== 0 || this.rightValue !== 0 || this.lateralValue !== 0;
  }

  isTurning(): boolean {
    if (this.turnValue !== 0) return true;
    return this.leftValue !== this.rightValue && (this.leftValue !== 0 || this.rightValue !== 0);
  }

  isStopped(): boolean {
    return (
      !this.isDriving() &&
      this.turnValue === 0
    );
  }

  reset(): void {
    this.pending = null;
    this.justCompleted = false;
    this.noteStopped();
  }
}
