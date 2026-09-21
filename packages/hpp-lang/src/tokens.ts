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

/** Nomes canônicos de ação (PT/EN viram um destes; ver ACTIONS). */
export type ActionName =
  | 'drive' | 'turn' | 'kick' | 'stop' | 'aimBall' | 'aimGoal' | 'radioSend' | 'dribble';

const ACTIONS: Record<string, ActionSpec> = {
  ANDAR: { name: 'drive', args: 1 }, DRIVE: { name: 'drive', args: 1 },
  GIRAR: { name: 'turn', args: 1 }, TURN: { name: 'turn', args: 1 },
  CHUTAR: { name: 'kick', args: 0 }, KICK: { name: 'kick', args: 0 },
  PARAR: { name: 'stop', args: 0 }, STOP: { name: 'stop', args: 0 },
  MIRAR_BOLA: { name: 'aimBall', args: 0 }, AIM_BALL: { name: 'aimBall', args: 0 },
  MIRAR_GOL: { name: 'aimGoal', args: 0 }, AIM_GOAL: { name: 'aimGoal', args: 0 },
  ENVIAR_RADIO: { name: 'radioSend', args: 1 }, RADIO_SEND: { name: 'radioSend', args: 1 },
  DRIBLAR: { name: 'dribble', args: 1 }, DRIBBLE: { name: 'dribble', args: 1 }
};

export function lookupKeyword(word: string): KeywordKind | null {
  return KEYWORDS[word.toUpperCase()] ?? null;
}

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
