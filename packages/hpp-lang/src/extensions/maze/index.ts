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

export const MAZE_EXT_VERSION = '0.2.0';

export const MAZE_EXTENSION: ExtensionDescriptor = {
  id: 'maze',
  version: MAZE_EXT_VERSION,
  domain: 'Maze / Labyrinth',
  /** §18/§33: distância, parede, bússola e encoder — sem depender de nenhum outro domínio. */
  capabilities: ['motor', 'encoder', 'distance_sensor', 'wall_detector', 'compass'],
  sensors: [
    'dist_frente', 'dist_ahead',
    'dist_esq', 'dist_left',
    'dist_dir', 'dist_right',
    'parede_frente', 'wall_ahead',
    'parede_esquerda', 'wall_left',
    'parede_direita', 'wall_right',
    'bussola', 'compass',
    'encoder', 'odometria', 'odometry',
    'celula_x', 'cell_x',
    'celula_z', 'cell_z'
  ],
  actions: ['drive', 'turn', 'stop'],
  sensorRequires: {
    parede_frente: ['wall_detector'],
    wall_ahead: ['wall_detector'],
    parede_esquerda: ['wall_detector'],
    wall_left: ['wall_detector'],
    parede_direita: ['wall_detector'],
    wall_right: ['wall_detector'],
    encoder: ['encoder'],
    odometria: ['odometry'],
    odometry: ['odometry']
  }
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
