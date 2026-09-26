/**
 * H++ Robotics — ações (atuadores).
 *
 * Nomes canônicos de ação: o programa H++ usa verbos PT/EN (`ANDAR`/`DRIVE`),
 * o lexer resolve para um destes canônicos e o interpretador despacha para o
 * `Hardware` do adapter. Domínios podem adicionar verbos próprios via
 * `ExtensionDescriptor.verbs` sem tocar a gramática.
 */

export type { ActionName, ActionSpec } from '../tokens.js';

import type { ActionName } from '../tokens.js';

/** Ações canônicas executáveis por qualquer hardware H++. */
export const CANONICAL_ACTIONS = [
  'drive',
  'reverse',
  'stop',
  'turn',
  'turnLeft',
  'turnRight',
  'driveFor',
  'reverseFor',
  'turnFor',
  'stopFor',
  'wait',
  'driveMeters',
  'reverseMeters',
  'turnDegrees',
  'motor',
  'motorLeft',
  'motorRight',
  'motors',
  'curve',
  'moveLateral',
  'moveXY',
  'kick',
  'aimBall',
  'aimGoal',
  'radioSend',
  'dribble'
] as const;

export type CanonicalAction = (typeof CANONICAL_ACTIONS)[number];

/** Igualdade estrutural de uniões de literais (garante lista ↔ `ActionName`). */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type AssertTrue<T extends true> = T;
/** Compila com erro se `CANONICAL_ACTIONS` sair de sincronia com `ActionName`. */
type _CanonicalMatchesActionName = AssertTrue<Equals<CanonicalAction, ActionName>>;
