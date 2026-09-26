import { describe, it, expect } from 'vitest';
import { compile, HppRuntime, MAZE_EXTENSION } from '../packages/hpp-lang/src/index';
import { checkProgramActions } from '../packages/hpp-lang/src/capabilities';
import type { DistanceSensor, WallDetector, Navigator, GridCell } from '../packages/hpp-lang/src/extensions/maze/index';
import type { Hardware, SensorValue } from '../packages/hpp-lang/src/hardware';

const DT = 1 / 120;

function prog(src: string) {
  const c = compile(src, { extraActions: MAZE_EXTENSION.verbs });
  expect(c.errors).toEqual([]);
  return c.program!;
}

/** Hardware de labirinto mínimo: sensores de distância/parede/bússola. */
function mazeHw(): Hardware & { log: string[] } {
  const log: string[] = [];
  return {
    log,
    sensors: (): Record<string, SensorValue> => ({
      dist_frente: 0.8,
      dist_ahead: 0.8,
      dist_esq: 0.1,
      dist_dir: 0.1,
      parede_frente: false,
      wall_ahead: false,
      parede_esquerda: true,
      wall_left: true,
      parede_direita: true,
      wall_right: true,
      bussola: 0,
      compass: 0
    }),
    drive: (t) => log.push(`drive:${t}`),
    turn: (s) => log.push(`turn:${s}`),
    stop: () => log.push('stop'),
    fire: () => {},
    aimMain: () => {},
    aimSecondary: () => {},
    radioSend: () => {},
    dribble: () => {}
  };
}

function mazeRuntime() {
  const hw = mazeHw();
  const rt = new HppRuntime(hw, [...MAZE_EXTENSION.capabilities], MAZE_EXTENSION.id, MAZE_EXTENSION.version);
  rt.dt = DT;
  return { hw, rt };
}

describe('Maze: contratos (§12/§25)', () => {
  it('o descritor declara as capabilities e sensores pedidos (§18/§33)', () => {
    expect(MAZE_EXTENSION.id).toBe('maze');
    expect(MAZE_EXTENSION.capabilities).toEqual(
      expect.arrayContaining(['motor', 'encoder', 'distance_sensor', 'wall_detector', 'compass'])
    );
    expect(MAZE_EXTENSION.sensors).toEqual(
      expect.arrayContaining([
        'dist_frente', 'dist_esq', 'dist_dir',
        'parede_frente', 'parede_esquerda', 'parede_direita',
        'bussola', 'encoder'
      ])
    );
    expect(MAZE_EXTENSION.actions).toEqual(['drive', 'turn', 'stop']);
  });

  it('as interfaces de contrato existem e são só contrato (§32)', () => {
    const distance: DistanceSensor = { read: () => 0.4 };
    const wall: WallDetector = { wallAhead: () => false, wallLeft: () => true, wallRight: () => false };
    const nav: Navigator = { nextWaypoint: (_c: GridCell) => null };
    expect(distance.read()).toBe(0.4);
    expect(wall.wallLeft()).toBe(true);
    expect(nav.nextWaypoint({ x: 0, z: 0 })).toBeNull();
  });

  it('leitura de parede exige wall_detector (§20)', () => {
    const progWithWall = prog('SE parede_frente ENTAO PARAR SENAO ANDAR 0.5 FIM');
    const without = checkProgramActions(progWithWall.statements, ['motor', 'distance_sensor'], MAZE_EXTENSION);
    expect(without).toContain('parede_frente');
    expect(without).toContain('wall_detector');
    const withWall = checkProgramActions(progWithWall.statements, [...MAZE_EXTENSION.capabilities], MAZE_EXTENSION);
    expect(withWall).toBeNull();
  });
});

describe('Maze: movimentação básica com primitivas Robotics (§18/§26)', () => {
  it('ANDAR/GIRAR/PARAR rodam sobre hardware de maze, sem Soccer', () => {
    const { hw, rt } = mazeRuntime();
    const p = prog('ANDAR 0.5\nGIRAR 0.3\nPARAR');
    expect(checkProgramActions(p.statements, [...MAZE_EXTENSION.capabilities], MAZE_EXTENSION)).toBeNull();
    expect(rt.runProgram(p).ok).toBe(true);
    expect(hw.log).toEqual(['drive:0.5', 'turn:0.3', 'stop']);
  });

  it('GIRAR_GRAUS usa a bússola do maze para parar no ângulo certo', () => {
    const { hw, rt } = mazeRuntime();
    const p = prog('GIRAR_GRAUS 90');
    expect(rt.runProgram(p).suspended).toBe(true);
    expect(hw.log).toEqual(['turn:1']);
    // sem leitura nova da bússola continua girando (não finge)
    expect(rt.runProgram(p).suspended).toBe(true);
    expect(hw.log).toEqual(['turn:1']);
  });

  it('decisão simples de labirinto com sensores de distância', () => {
    const { hw, rt } = mazeRuntime();
    const p = prog('SE dist_frente < 0.3 ENTAO PARAR SENAO ANDAR 0.5 FIM');
    expect(rt.runProgram(p).ok).toBe(true);
    expect(hw.log).toEqual(['drive:0.5']);
  });

  it('primitivas temporais também funcionam no domínio Maze', () => {
    const { hw, rt } = mazeRuntime();
    const p = prog('ESPERAR 0.1\nANDAR 0.4');
    let r = rt.runProgram(p);
    expect(r.suspended).toBe(true);
    for (let i = 0; i < 100 && r.suspended; i++) r = rt.runProgram(p);
    expect(r.suspended).toBe(false);
    expect(hw.log).toEqual(['drive:0.4']);
  });
});
