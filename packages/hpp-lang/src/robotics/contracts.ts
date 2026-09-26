import type { Capability } from '../capabilities.js';

/**
 * Contratos da camada **HPP Robotics Motion** (§4 do plano multidomínio).
 *
 * ```text
 * H++ → Lexer → Parser → AST → Interpreter → HppRuntime → Robotics → Capabilities
 *                                                                ↓
 *                                                    Domain Adapter (soccer/line/maze)
 * ```
 *
 * Estes tipos são a fronteira entre o Core (que só sabe "executar uma ação")
 * e os adapters (que sabem como transformar a ação em física). Nada aqui
 * importa domínio, Three.js, sensores ou motores concretos.
 *
 * Princípio: **primitiva ≠ comportamento ≠ domínio** (§19). Um `MotionCommand`
 * é um movimento; `SEGUIR_PAREDE` é comportamento (extensão); `CHUTAR` é
 * domínio (extensão soccer).
 */

/** Ação de movimento pedida ao hardware, em forma normalizada. */
export interface MotionCommand {
  /** Verbo canônico (mesmo vocabulário do `ActionName` de movimento). */
  readonly action: MotionAction;
  /** Parâmetro normalizado -1..1 (velocidade/steer), quando houver. */
  readonly value?: number;
  /** Segundos, para comandos temporais (`ANDAR_POR`, `ESPERAR`…). */
  readonly duration?: number;
  /** Metros, para `ANDAR_METROS`/`VOLTAR_METROS`. */
  readonly distance?: number;
  /** Graus, para `GIRAR_GRAUS`. */
  readonly degrees?: number;
  /** Segundo eixo/roda, para comandos de dois valores (`MOTORES`, `CURVA`). */
  readonly value2?: number;
}

/**
 * Verbos de movimento da camada Robotics (subconjunto do `ActionName`).
 * É o vocabulário compartilhado: todo domínio pode usá-los.
 */
export type MotionAction =
  | 'drive' | 'reverse' | 'stop' | 'turn' | 'turnLeft' | 'turnRight'
  | 'driveFor' | 'reverseFor' | 'turnFor' | 'stopFor' | 'wait'
  | 'driveMeters' | 'reverseMeters' | 'turnDegrees'
  | 'motor' | 'motorLeft' | 'motorRight' | 'motors'
  | 'curve' | 'moveLateral' | 'moveXY';

/** O que o hardware sabe fazer de movimento. */
export interface MotionCapabilities {
  /** Movimento contínuo básico (`ANDAR`, `GIRAR`, `PARAR`). */
  basic: boolean;
  /** Comandos temporais não bloqueantes (`ANDAR_POR`, `ESPERAR`…). */
  timed: boolean;
  /** Movimento por distância/ângulo (exige `encoder`/`odometry`). */
  spatial: boolean;
  /** Curva combinando throttle + steer (`CURVA`). */
  curve: boolean;
  /** Movimento holonômico lateral/XY (exige `holonomic_drive`). */
  holonomic: boolean;
}

/** Controle de motores: NÃO é propriedade universal do robô (§10). */
export interface MotorCapabilities {
  /** Existe ao menos uma saída de motor. */
  present: boolean;
  /** Quantidade de saídas endereçáveis (0 = desconhecido/não endereçável). */
  count: number;
  /** `MOTOR id, v` — motor individual por índice. */
  individual: boolean;
  /** `MOTOR_ESQUERDO v` */
  left: boolean;
  /** `MOTOR_DIREITO v` */
  right: boolean;
}

/** Odometria: base dos comandos por distância/ângulo (§8). */
export interface EncoderCapabilities {
  /** Encoder de distância (metros percorridos). */
  encoder: boolean;
  /** Odometria combinada (distância + ângulo). */
  odometry: boolean;
}

/** Tipos de locomoção suportados pelo chassi (§10–§12). */
export interface LocomotionCapabilities {
  /** Duas rodas com steering equivalente (diferencial). */
  differential: boolean;
  /** Omnidirecional (move lateral sem girar). */
  holonomic: boolean;
}

/** Perfil completo derivado das `Capability[]` declaradas pelo hardware. */
export interface RoboticsProfile {
  motion: MotionCapabilities;
  motors: MotorCapabilities;
  encoders: EncoderCapabilities;
  locomotion: LocomotionCapabilities;
}

const has = (caps: Capability[], c: Capability): boolean => caps.includes(c);

/** Deriva o perfil de movimento a partir das capabilities declaradas. */
export function roboticsProfile(caps: Capability[]): RoboticsProfile {
  const encoder = has(caps, 'encoder');
  const odometry = has(caps, 'odometry');
  const left = has(caps, 'motor_left');
  const right = has(caps, 'motor_right');
  const individual = has(caps, 'motor_individual');
  return {
    motion: {
      basic: has(caps, 'motor'),
      timed: true, // relógio do runtime: sempre disponível no núcleo
      spatial: encoder || odometry,
      curve: has(caps, 'motor') || has(caps, 'differential_drive'),
      holonomic: has(caps, 'holonomic_drive')
    },
    motors: {
      present: has(caps, 'motor'),
      count: individual ? 2 : left || right ? 1 : has(caps, 'differential_drive') ? 2 : 0,
      individual,
      left,
      right
    },
    encoders: { encoder, odometry },
    locomotion: {
      differential: has(caps, 'differential_drive'),
      holonomic: has(caps, 'holonomic_drive')
    }
  };
}
