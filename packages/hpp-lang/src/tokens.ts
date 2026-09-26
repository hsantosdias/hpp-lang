/** Palavras-chave bilíngues: forma canônica + apelidos PT/EN (maiúsculas). */
export type KeywordKind =
  | 'IF' | 'THEN' | 'ELSE' | 'END'
  | 'WHILE' | 'DO' | 'REPEAT' | 'TIMES'
  | 'FOR' | 'FROM' | 'TO' | 'STEP'
  | 'FUNCTION' | 'RETURN'
  | 'AND' | 'OR' | 'NOT' | 'TRUE' | 'FALSE'
  | 'WHEN' | 'ALWAYS';

const KEYWORDS: Record<string, KeywordKind> = {
  SE: 'IF', IF: 'IF',
  ENTAO: 'THEN', THEN: 'THEN',
  SENAO: 'ELSE', ELSE: 'ELSE',
  FIM: 'END', END: 'END',
  ENQUANTO: 'WHILE', WHILE: 'WHILE',
  FACA: 'DO', DO: 'DO',
  REPETIR: 'REPEAT', REPEAT: 'REPEAT',
  VEZES: 'TIMES', TIMES: 'TIMES',
  PARA: 'FOR', FOR: 'FOR',
  DE: 'FROM', FROM: 'FROM',
  ATE: 'TO', TO: 'TO',
  PASSO: 'STEP', STEP: 'STEP',
  FUNCAO: 'FUNCTION', FUNCTION: 'FUNCTION',
  RETORNAR: 'RETURN', RETURN: 'RETURN',
  E: 'AND', AND: 'AND',
  OU: 'OR', OR: 'OR',
  NAO: 'NOT', NOT: 'NOT',
  VERDADEIRO: 'TRUE', TRUE: 'TRUE',
  FALSO: 'FALSE', FALSE: 'FALSE',
  QUANDO: 'WHEN', WHEN: 'WHEN',
  SEMPRE: 'ALWAYS', ALWAYS: 'ALWAYS'
};

/** Ações-atuadores: nome canônico + nº de argumentos. */
export interface ActionSpec {
  name: ActionName;
  args: number;
}

/**
 * Nomes canônicos de ação (PT/EN viram um destes; ver ACTIONS).
 *
 * Três famílias, separadas de propósito (§19 — primitiva ≠ comportamento ≠ domínio):
 * - **Robotics** (`drive`…`moveXY`): movimento robótico universal, compartilhado
 *   por qualquer domínio ou robô físico. Ver `robotics/`.
 * - **Extensão** (`kick`, `aimBall`, `aimGoal`, `radioSend`, `dribble`): domínio.
 * - Comportamentos (`SEGUIR_PAREDE`…) nunca entram aqui: ficam na extensão.
 */
export type ActionName =
  // Robotics — movimento básico
  | 'drive' | 'reverse' | 'stop' | 'turn' | 'turnLeft' | 'turnRight'
  // Robotics — movimento temporal (não bloqueante)
  | 'driveFor' | 'reverseFor' | 'turnFor' | 'stopFor' | 'wait'
  // Robotics — movimento espacial (exige encoder/odometria)
  | 'driveMeters' | 'reverseMeters' | 'turnDegrees'
  // Robotics — controle de motores (exige capabilities)
  | 'motor' | 'motorLeft' | 'motorRight' | 'motors'
  // Robotics — movimento avançado (exige capabilities)
  | 'curve' | 'moveLateral' | 'moveXY'
  // Extensão de domínio (mantidos como extensão, §16)
  | 'kick' | 'aimBall' | 'aimGoal' | 'radioSend' | 'dribble';

const ACTIONS: Record<string, ActionSpec> = {
  // ---- Robotics: movimento básico ----
  ANDAR: { name: 'drive', args: 1 }, DRIVE: { name: 'drive', args: 1 },
  VOLTAR: { name: 'reverse', args: 1 }, REVERSE: { name: 'reverse', args: 1 },
  PARAR: { name: 'stop', args: 0 }, STOP: { name: 'stop', args: 0 },
  GIRAR: { name: 'turn', args: 1 }, TURN: { name: 'turn', args: 1 },
  VIRAR_ESQUERDA: { name: 'turnLeft', args: 1 },
  GIRAR_ESQUERDA: { name: 'turnLeft', args: 1 },
  TURN_LEFT: { name: 'turnLeft', args: 1 },
  VIRAR_DIREITA: { name: 'turnRight', args: 1 },
  GIRAR_DIREITA: { name: 'turnRight', args: 1 },
  TURN_RIGHT: { name: 'turnRight', args: 1 },
  // ---- Robotics: movimento temporal ----
  ANDAR_POR: { name: 'driveFor', args: 2 }, DRIVE_FOR: { name: 'driveFor', args: 2 },
  VOLTAR_POR: { name: 'reverseFor', args: 2 }, REVERSE_FOR: { name: 'reverseFor', args: 2 },
  GIRAR_POR: { name: 'turnFor', args: 2 }, TURN_FOR: { name: 'turnFor', args: 2 },
  PARAR_POR: { name: 'stopFor', args: 1 }, STOP_FOR: { name: 'stopFor', args: 1 },
  ESPERAR: { name: 'wait', args: 1 }, WAIT: { name: 'wait', args: 1 },
  // ---- Robotics: movimento espacial ----
  ANDAR_METROS: { name: 'driveMeters', args: 1 }, DRIVE_METERS: { name: 'driveMeters', args: 1 },
  VOLTAR_METROS: { name: 'reverseMeters', args: 1 }, REVERSE_METERS: { name: 'reverseMeters', args: 1 },
  GIRAR_GRAUS: { name: 'turnDegrees', args: 1 }, TURN_DEGREES: { name: 'turnDegrees', args: 1 },
  // ---- Robotics: controle de motores ----
  MOTOR: { name: 'motor', args: 2 },
  MOTOR_ESQUERDO: { name: 'motorLeft', args: 1 }, LEFT_MOTOR: { name: 'motorLeft', args: 1 },
  MOTOR_DIREITO: { name: 'motorRight', args: 1 }, RIGHT_MOTOR: { name: 'motorRight', args: 1 },
  MOTORES: { name: 'motors', args: 2 }, MOTORS: { name: 'motors', args: 2 },
  // ---- Robotics: movimento avançado ----
  CURVA: { name: 'curve', args: 2 }, CURVE: { name: 'curve', args: 2 },
  MOVER_LATERAL: { name: 'moveLateral', args: 1 }, MOVE_LATERAL: { name: 'moveLateral', args: 1 },
  MOVER_XY: { name: 'moveXY', args: 2 }, MOVE_XY: { name: 'moveXY', args: 2 },
  // ---- Domínio (extensão) ----
  CHUTAR: { name: 'kick', args: 0 }, KICK: { name: 'kick', args: 0 },
  MIRAR_BOLA: { name: 'aimBall', args: 0 }, AIM_BALL: { name: 'aimBall', args: 0 },
  MIRAR_GOL: { name: 'aimGoal', args: 0 }, AIM_GOAL: { name: 'aimGoal', args: 0 },
  ENVIAR_RADIO: { name: 'radioSend', args: 1 }, RADIO_SEND: { name: 'radioSend', args: 1 },
  DRIBLAR: { name: 'dribble', args: 1 }, DRIBBLE: { name: 'dribble', args: 1 }
};

export function lookupKeyword(word: string): KeywordKind | null {
  return KEYWORDS[word.toUpperCase()] ?? null;
}

/** Nome de exibição PT da ação canônica (mensagens pedagógicas de erro). */
export const ACTION_PT: Record<ActionName, string> = {
  drive: 'ANDAR',
  reverse: 'VOLTAR',
  stop: 'PARAR',
  turn: 'GIRAR',
  turnLeft: 'VIRAR_ESQUERDA',
  turnRight: 'VIRAR_DIREITA',
  driveFor: 'ANDAR_POR',
  reverseFor: 'VOLTAR_POR',
  turnFor: 'GIRAR_POR',
  stopFor: 'PARAR_POR',
  wait: 'ESPERAR',
  driveMeters: 'ANDAR_METROS',
  reverseMeters: 'VOLTAR_METROS',
  turnDegrees: 'GIRAR_GRAUS',
  motor: 'MOTOR',
  motorLeft: 'MOTOR_ESQUERDO',
  motorRight: 'MOTOR_DIREITO',
  motors: 'MOTORES',
  curve: 'CURVA',
  moveLateral: 'MOVER_LATERAL',
  moveXY: 'MOVER_XY',
  kick: 'CHUTAR',
  aimBall: 'MIRAR_BOLA',
  aimGoal: 'MIRAR_GOL',
  radioSend: 'ENVIAR_RADIO',
  dribble: 'DRIBLAR'
};

export function lookupAction(word: string): ActionSpec | null {
  return ACTIONS[word.toUpperCase()] ?? null;
}

export type TokenType =
  | 'NUMBER' | 'STRING' | 'IDENT'
  | 'KEYWORD' | 'ACTION'
  | 'OP' | 'PUNCT' | 'NEWLINE' | 'EOF';

export interface Token {
  type: TokenType;
  /** Texto original (identificadores normalizados p/ minúsculas). */
  value: string;
  numValue?: number;
  keyword?: KeywordKind;
  action?: ActionSpec;
  line: number;
  col: number;
}
