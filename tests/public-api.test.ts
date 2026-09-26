import { describe, it, expect } from 'vitest';
import {
  Lexer,
  Parser,
  Interpreter,
  HppRuntime,
  compile,
  HPP_ROBOTICS_VERSION,
  MOTION_ACTIONS,
  MOTION_STATE_SENSORS,
  isMotionAction,
  missingMotionCapability
} from '../packages/hpp-lang/src/index';
import type {
  MotionAction,
  MotionCommand,
  RoboticsProfile,
  RunOptions,
  RunResult
} from '../packages/hpp-lang/src/index';
import { normalizeSnapshotKeys } from '../packages/hpp-lang/src/robotics/snapshot';
import { CANONICAL_ACTIONS } from '../packages/hpp-lang/src/robotics/actions';
import { roboticsProfile } from '../packages/hpp-lang/src/robotics/contracts';
import type { Hardware } from '../packages/hpp-lang/src/hardware';

function bareHw(): Hardware {
  return {
    sensors: () => ({}),
    drive: () => {},
    turn: () => {},
    fire: () => {},
    stop: () => {},
    aimMain: () => {},
    aimSecondary: () => {},
    radioSend: () => {},
    dribble: () => {}
  };
}

describe('public API: pipeline pieces are importable from hpp-lang', () => {
  it('Lexer/Parser/Interpreter/HppRuntime round-trip without domains', () => {
    const { tokens, errors } = Lexer('SE 1 == 1 ENTAO ANDAR 0.5 FIM');
    expect(errors).toEqual([]);
    const parser = new Parser(tokens);
    const stmts = parser.parse();
    expect(parser.errors).toEqual([]);
    const log: string[] = [];
    const hw = { ...bareHw(), drive: (t: number) => log.push(`drive:${t}`) };
    const interp = new Interpreter();
    const r = interp.run(stmts, hw);
    expect(r.ok).toBe(true);
    expect(log).toEqual(['drive:0.5']);
    const rt = new HppRuntime(hw, [], 'generic', '0.0.0');
    expect(rt.ciclo).toBe(0);
  });

  it('compile() is the recommended entrypoint', () => {
    const { program, errors } = compile('ANDAR 0.5');
    expect(errors).toEqual([]);
    expect(program).not.toBeNull();
  });

  it('canonical action vocabulary is stable', () => {
    expect([...CANONICAL_ACTIONS]).toEqual([
      'drive',
      'reverse',
      'stop',
      'turn',
      'turnLeft',
      'turnRight',
      'driveFor',
      'reverseFor',
      'turnFor',
      'stopFor',
      'wait',
      'driveMeters',
      'reverseMeters',
      'turnDegrees',
      'motor',
      'motorLeft',
      'motorRight',
      'motors',
      'curve',
      'moveLateral',
      'moveXY',
      'kick',
      'aimBall',
      'aimGoal',
      'radioSend',
      'dribble'
    ]);
  });
});

describe('robotics/snapshot: key normalization matches the interpreter', () => {
  it('lowercases keys', () => {
    expect(normalizeSnapshotKeys({ Bussola: 10, VER_BOLA: true })).toEqual({
      bussola: 10,
      ver_bola: true
    });
  });
});


describe('public API: Robotics Motion Primitives (5-14)', () => {
  it('motion contract exports are part of the package root', () => {
    expect(HPP_ROBOTICS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(MOTION_ACTIONS).toHaveLength(21);
    expect(MOTION_STATE_SENSORS).toEqual(
      expect.arrayContaining([
        'esta_andando',
        'esta_parado',
        'movimento_ativo',
        'movimento_concluido'
      ])
    );
  });

  it('isMotionAction separates Robotics primitives from domain actions', () => {
    expect(isMotionAction('drive')).toBe(true);
    expect(isMotionAction('driveFor')).toBe(true);
    expect(isMotionAction('moveXY')).toBe(true);
    expect(isMotionAction('kick')).toBe(false);
    expect(isMotionAction('dribble')).toBe(false);
  });

  it('capability gate for spatial/motor movement is exported', () => {
    expect(missingMotionCapability('drive', [])).toBeNull();
    expect(missingMotionCapability('driveMeters', [])).toEqual(['encoder', 'odometry']);
    expect(missingMotionCapability('driveMeters', ['encoder'])).toBeNull();
    expect(missingMotionCapability('motors', [])).toEqual(['differential_drive']);
  });

  it('motion/run types are usable from the package root', () => {
    const opts: RunOptions = { capabilities: null, dt: 1 / 120 };
    expect(opts.dt).toBeCloseTo(1 / 120);
    const action: MotionAction = 'driveFor';
    expect(MOTION_ACTIONS).toContain(action);
    const cmd: MotionCommand = { action: 'driveFor', value: 0.5, duration: 1 };
    expect(cmd.duration).toBe(1);
    const profile: RoboticsProfile = roboticsProfile(['motor', 'encoder']);
    expect(profile.motion.timed).toBe(true);
    expect(profile.motion.spatial).toBe(true);
    const result: RunResult = { ok: true, steps: 1 };
    expect(result.ok).toBe(true);
  });
});