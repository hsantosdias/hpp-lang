/**
 * Versionamento explícito da linguagem (§17 do plano H++ multidomínio).
 * Versões SEPARADAS: simulador ≠ H++ core ≠ extensões de domínio.
 */
export const HPP_CORE_VERSION = '0.5.0';

export interface VersionInfo {
  /** Versão do núcleo H++ (lexer/parser/AST/interpreter/runtime). */
  core: string;
  /** Versão da extensão de domínio ativa (ex.: soccer 0.1.0). */
  extension: string;
  /** Id da extensão ativa (ex.: 'soccer'). */
  extensionId: string;
}
