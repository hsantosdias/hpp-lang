/**
 * Erros do H++ (núcleo puro, sem dependências).
 *
 * Extraído de `interpreter.ts` durante a migração para o repositório
 * independente, para que lexer, parser e ferramentas externas possam
 * referenciar o formato de erro sem importar o interpretador.
 * Semântica e mensagens 100% preservadas.
 */

/** Erro apresentável ao aluno: sempre com linha e mensagem em português. */
export interface HppError {
  line: number;
  col: number;
  message: string;
}

/** Erro interno de execução (vira `HppError` na borda do `run()`). */
export class RuntimeError extends Error {
  constructor(
    public line: number,
    public message: string
  ) {
    super(message);
  }
}
