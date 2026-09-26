import { ExtensionDescriptor } from '../../capabilities.js';
import { Hardware, SensorValue } from '../../hardware.js';

/**
 * Extensão Line (§11, mínima): contratos para seguidores de linha.
 * Seguidor de linha é H++ com outro vocabulário — mesma gramática,
 * mesmo interpretador, sem nenhum outro domínio em nenhum import daqui.
 */

export const LINE_EXT_VERSION = '0.2.0';

export const LINE_EXTENSION: ExtensionDescriptor = {
  id: 'line',
  version: LINE_EXT_VERSION,
  domain: 'Line Following',
  /** §17: `line_sensor` + `motor` + `encoder`. Sem nenhum outro domínio daqui. */
  capabilities: ['motor', 'encoder', 'line_sensor'],
  sensors: [
    'linha_esq', 'line_left',
    'linha_centro', 'line_center',
    'linha_dir', 'line_right',
    'erro_linha', 'line_error',
    'encoder', 'odometria', 'odometry',
    'ciclo', 'cycle'
  ],
  actions: ['drive', 'turn', 'stop'],
  sensorRequires: {
    encoder: ['encoder'],
    odometria: ['odometry'],
    odometry: ['odometry']
  }
};

/** Leitura de N sensores de refletância (0 = branco, 1 = preto). */
export interface LineArrayReading {
  values: number[];
}

/** Sensor de linha genérico: funciona no simulador, ESP32, RP2040... */
export interface LineSensor {
  read(): LineArrayReading;
}

/** Erro lateral da linha (-1..1): 0 = centrado. Base do PID de linha. */
export function lineError(reading: LineArrayReading): number {
  const n = reading.values.length;
  if (n === 0) return 0;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const w = (i / (n - 1)) * 2 - 1; // -1 (esq) .. +1 (dir)
    num += w * reading.values[i];
    den += reading.values[i];
  }
  return den === 0 ? 0 : num / den;
}

/** Controlador de linha (P/PD): exemplo de uso no adapter, não no núcleo. */
export interface LineController {
  update(error: number, deltaTime: number): { throttle: number; steer: number };
}

/**
 * Hardware de mentira para seguidores de linha (testes e sala de aula):
 * implementa só o subconjunto que o domínio Line precisa.
 */
export class MockLineHardware implements Hardware {
  readonly log: string[] = [];
  /** Sensores injetados pelo teste (esq, centro, dir). */
  lineValues: number[] = [0, 0, 0];

  sensors(): Record<string, SensorValue> {
    return {
      linha_esq: this.lineValues[0] ?? 0,
      line_left: this.lineValues[0] ?? 0,
      linha_centro: this.lineValues[1] ?? 0,
      line_center: this.lineValues[1] ?? 0,
      linha_dir: this.lineValues[2] ?? 0,
      line_right: this.lineValues[2] ?? 0,
      erro_linha: lineError({ values: this.lineValues }),
      line_error: lineError({ values: this.lineValues })
    };
  }

  drive(throttle: number): void {
    this.log.push(`drive:${throttle}`);
  }

  turn(steer: number): void {
    this.log.push(`turn:${steer}`);
  }

  fire(): void {
    this.log.push('fire');
  }

  stop(): void {
    this.log.push('stop');
  }

  aimMain(): void {
    this.log.push('aimMain');
  }

  aimSecondary(): void {
    this.log.push('aimSecondary');
  }

  radioSend(msg: number): void {
    this.log.push(`radio:${msg}`);
  }

  dribble(on: boolean): void {
    this.log.push(`dribble:${on}`);
  }
}
