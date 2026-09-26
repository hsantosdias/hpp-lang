import type { ActionName } from './tokens.js';

/** Árvore sintática do H++ (nós com linha p/ erros amigáveis). */
export type Expr =
  | { kind: 'num'; value: number; line: number }
  | { kind: 'str'; value: string; line: number }
  | { kind: 'bool'; value: boolean; line: number }
  | { kind: 'var'; name: string; line: number }
  | { kind: 'unary'; op: '-' | 'NOT'; expr: Expr; line: number }
  | { kind: 'binary'; op: string; left: Expr; right: Expr; line: number }
  | { kind: 'call'; name: string; args: Expr[]; line: number };

export type Stmt =
  | { kind: 'assign'; name: string; expr: Expr; line: number }
  | { kind: 'expr'; expr: Expr; line: number }
  | { kind: 'action'; name: ActionName; args: Expr[]; line: number }
  | { kind: 'if'; cond: Expr; then: Stmt[]; otherwise: Stmt[]; line: number }
  | { kind: 'while'; cond: Expr; body: Stmt[]; line: number }
  | { kind: 'repeat'; count: Expr; body: Stmt[]; line: number }
  | { kind: 'for'; name: string; from: Expr; to: Expr; step: Expr | null; body: Stmt[]; line: number }
  | { kind: 'func'; name: string; params: string[]; body: Stmt[]; line: number }
  | { kind: 'return'; expr: Expr | null; line: number }
  | { kind: 'always'; body: Stmt[]; line: number };
