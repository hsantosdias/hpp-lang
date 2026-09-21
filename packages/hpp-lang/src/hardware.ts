/**
 * Contrato de hardware do H++: o núcleo da linguagem só enxerga SENSORES
 * (leitura, foto tirada a cada ciclo) e AÇÕES (atuadores). Qualquer projeto —
 * futebol, seguidor de linha, robô físico — implementa esta interface
 * (ver `adapters/` no futuro; hoje o simulador injeta o adapter soccer).
 */
export type SensorValue = number | boolean | string;

export interface Hardware {
  /** Foto nova dos sensores a cada ciclo (tick). */
  sensors(): Record<string, SensorValue>;
  /**
   * Relógio: o núcleo fornece `ciclo` (determinístico); tempo de parede/jogo
   * (`tempo`) é responsabilidade do domínio via snapshot, se fizer sentido.
   */
  /** Avanço (-1..1). Valores fora da faixa são aparados. */
  drive(throttle: number): void;
  /** Giro (-1..1). Valores fora da faixa são aparados. */
  turn(steer: number): void;
  /** Dispara o atuador principal (chute/garra/luz — depende do hardware). */
  fire(): void;
  /** Para tudo. */
  stop(): void;
  /** Mira sozinho o alvo principal (bola/linha) com controle P. */
  aimMain(): void;
  /** Mira sozinho o alvo secundário (gol/base). */
  aimSecondary(): void;
  /** Envia um número no rádio da equipe. */
  radioSend(msg: number): void;
  /** Liga/desliga o rolete de drible (gruda a bola na frente). */
  dribble(on: boolean): void;
}
