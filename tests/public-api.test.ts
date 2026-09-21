import { describe, it, expect } from 'vitest';
import { Lexer, Parser, Interpreter, HppRuntime, compile } from '../packages/hpp-lang/src/index';
import { normalizeSnapshotKeys } from '../packages/hpp-lang/src/robotics/snapshot';
import { CANONICAL_ACTIONS } from '../packages/hpp-lang/src/robotics/actions';
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
      'turn',
      'kick',
      'stop',
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
