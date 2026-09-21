/**
 * H++ Robotics — sensores.
 *
 * Convenção de snapshot (preservada do simulador):
 * - o ambiente fornece uma "foto" `Record<string, SensorValue>` por ciclo;
 * - chaves são normalizadas para minúsculas (o interpretador faz o mesmo);
 * - o `HppRuntime` injeta `ciclo`/`cycle` (relógio determinístico do núcleo);
 * - o H++ NUNCA recebe posição absoluta do mundo — só percepção relativa
 *   (exceção documentada: `celula_x`/`cell_z` no domínio maze).
 */

import type { SensorValue } from '../hardware.js';

export type { SensorValue, Hardware } from '../hardware.js';

/** Uma foto dos sensores num ciclo de controle. */
export type SensorSnapshot = Record<string, SensorValue>;
