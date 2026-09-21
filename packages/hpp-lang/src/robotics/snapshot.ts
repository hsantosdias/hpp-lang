/**
 * H++ Robotics — ciclo de execução e snapshot.
 *
 * Espelha exatamente a normalização que o `Interpreter.run()` aplica ao
 * snapshot a cada ciclo (chaves em minúsculas), para que adapters e
 * ferramentas externas compartilhem a mesma regra sem duplicar lógica.
 */
import type { SensorValue } from '../hardware.js';
import type { SensorSnapshot } from './sensors.js';

/** Normaliza as chaves de um snapshot para minúsculas (regra do núcleo). */
export function normalizeSnapshotKeys(
  snap: Record<string, SensorValue>
): SensorSnapshot {
  const out: SensorSnapshot = {};
  for (const k in snap) {
    out[k.toLowerCase()] = snap[k];
  }
  return out;
}
