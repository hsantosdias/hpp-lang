import { ExtensionDescriptor } from '../../capabilities.js';

/**
 * Extensão Maze (§12, SÓ CONTRATOS): nenhuma lógica aqui de propósito
 * (§9: não implementar futuro desnecessariamente). Quando existir um
 * simulador/hardware de labirinto, ele implementa estas interfaces e
 * declara `MAZE_EXTENSION` — o núcleo H++ não muda.
 *
 * NOTA DE DOUTRINA: `celula_x/cell_z` (posição discreta) abrem exceção
 * deliberada à percepção relativa — mapear labirinto exige saber onde se
 * está na grade. É a única exceção prevista; todo o resto é relativo.
 */

export const MAZE_EXT_VERSION = '0.1.0';

export const MAZE_EXTENSION: ExtensionDescriptor = {
  id: 'maze',
  version: MAZE_EXT_VERSION,
  domain: 'Maze / Labyrinth',
  capabilities: ['motor', 'encoder', 'distance_sensor', 'compass'],
  sensors: [
    'dist_frente', 'dist_ahead',
    'dist_esq', 'dist_left',
    'dist_dir', 'dist_right',
    'bussola', 'compass',
    'celula_x', 'cell_x',
    'celula_z', 'cell_z'
  ],
  actions: ['drive', 'turn', 'stop']
};

/** Distância em metros numa direção. */
export interface DistanceSensor {
  read(): number;
}

/** Detector de parede (porta lógica sobre distância + limiar). */
export interface WallDetector {
  wallAhead(): boolean;
  wallLeft(): boolean;
  wallRight(): boolean;
}

/** Posição discreta no labirinto (para mapa/grafo futuro). */
export interface GridCell {
  x: number;
  z: number;
}

/** Mapa mínimo: diz se a célula é livre. */
export interface MazeMap {
  isFree(cell: GridCell): boolean;
}

/** Navegador futuro (exploração/caminho virão depois, §9). */
export interface Navigator {
  nextWaypoint(from: GridCell): GridCell | null;
}
