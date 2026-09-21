/**
 * H++ Robotics — ações (atuadores).
 *
 * Nomes canônicos de ação: o programa H++ usa verbos PT/EN (`ANDAR`/`DRIVE`),
 * o lexer resolve para um destes canônicos e o interpretador despacha para o
 * `Hardware` do adapter. Domínios podem adicionar verbos próprios via
 * `ExtensionDescriptor.verbs` sem tocar a gramática.
 */

export type { ActionName, ActionSpec } from '../tokens.js';

/** Ações canônicas executáveis por qualquer hardware H++. */
export const CANONICAL_ACTIONS = [
  'drive',
  'turn',
  'kick',
  'stop',
  'aimBall',
  'aimGoal',
  'radioSend',
  'dribble'
] as const;

export type CanonicalAction = (typeof CANONICAL_ACTIONS)[number];
