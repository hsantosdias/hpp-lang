import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { compile } from '../packages/hpp-lang/src/index';
import { EXAMPLES } from '../packages/hpp-lang/src/examples';
import { SOCCER_EXTENSION } from '../packages/hpp-lang/src/extensions/soccer';
import { LINE_EXTENSION } from '../packages/hpp-lang/src/extensions/line';
import { MAZE_EXTENSION } from '../packages/hpp-lang/src/extensions/maze';
import { checkProgramActions } from '../packages/hpp-lang/src/capabilities';

const EXAMPLES_DIR = path.resolve(__dirname, '../examples');

function hppFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...hppFiles(p));
    else if (e.name.endsWith('.hpp')) out.push(p);
  }
  return out.sort();
}

describe('examples/*.hpp compile cleanly', () => {
  const files = hppFiles(EXAMPLES_DIR);
  it('discovers example programs', () => {
    expect(files.length).toBeGreaterThan(0);
  });
  for (const f of files) {
    it(path.relative(EXAMPLES_DIR, f), () => {
      const src = fs.readFileSync(f, 'utf8');
      const { program, errors } = compile(src);
      expect(errors).toEqual([]);
      expect(program).not.toBeNull();
    });
  }
});

describe('EXAMPLES library parity', () => {
  it('every library example compiles', () => {
    for (const ex of EXAMPLES) {
      const r = compile(ex.code);
      expect(r.errors, ex.id).toEqual([]);
      expect(r.program).not.toBeNull();
    }
  });

  it('soccer examples fit the soccer domain gate', () => {
    const soccerIds = new Set([
      'danca',
      'perseguidor',
      'goleiro',
      'patrulha',
      'dupla',
      'cola',
      'linha',
      'segura',
      'atacante_v2',
      'atacante_v3',
      'atacante_v4',
      'predicados',
      'soccer_robotics'
    ]);
    for (const ex of EXAMPLES) {
      if (!soccerIds.has(ex.id)) continue;
      const { program, errors } = compile(ex.code);
      expect(errors, ex.id).toEqual([]);
      const msg = checkProgramActions(
        program!.statements,
        [...SOCCER_EXTENSION.capabilities],
        SOCCER_EXTENSION
      );
      expect(msg, ex.id).toBeNull();
    }
  });

  it('line/maze example programs fit their domain gates', () => {
    const line = compile(
      fs.readFileSync(path.join(EXAMPLES_DIR, '06-line/seguidor.hpp'), 'utf8')
    );
    expect(line.errors).toEqual([]);
    expect(
      checkProgramActions(line.program!.statements, [...LINE_EXTENSION.capabilities], LINE_EXTENSION)
    ).toBeNull();
    const maze = compile(
      fs.readFileSync(path.join(EXAMPLES_DIR, '07-maze/explorador.hpp'), 'utf8')
    );
    expect(maze.errors).toEqual([]);
    expect(
      checkProgramActions(maze.program!.statements, [...MAZE_EXTENSION.capabilities], MAZE_EXTENSION)
    ).toBeNull();

    const lineMotion = compile(
      fs.readFileSync(path.join(EXAMPLES_DIR, '08-motion/linha_robotics.hpp'), 'utf8')
    );
    expect(lineMotion.errors).toEqual([]);
    expect(
      checkProgramActions(
        lineMotion.program!.statements,
        [...LINE_EXTENSION.capabilities],
        LINE_EXTENSION
      )
    ).toBeNull();

    const mazeMotion = compile(
      fs.readFileSync(path.join(EXAMPLES_DIR, '08-motion/maze_robotics.hpp'), 'utf8')
    );
    expect(mazeMotion.errors).toEqual([]);
    expect(
      checkProgramActions(
        mazeMotion.program!.statements,
        [...MAZE_EXTENSION.capabilities],
        MAZE_EXTENSION
      )
    ).toBeNull();
  });
});

/**
 * Cada programa da biblioteca `EXAMPLES` tem um `.hpp` equivalente em
 * `examples/` (paridade byte-a-byte, módulo `trimEnd`) — é o que garante que
 * a sincronização com o simulador não deixe exemplo para trás.
 */
const EXAMPLE_FILES: Record<string, string> = {
  danca: '01-basics/danca.hpp',
  patrulha: '02-control/patrulha.hpp',
  predicados: '02-control/predicados.hpp',
  cola: '03-robotics/cola.hpp',
  dupla: '03-robotics/dupla.hpp',
  goleiro: '04-sensors/goleiro.hpp',
  perseguidor: '04-sensors/perseguidor.hpp',
  linha: '05-soccer/linha.hpp',
  segura: '05-soccer/segura.hpp',
  atacante_v2: '05-soccer/atacante_v2.hpp',
  atacante_v3: '05-soccer/atacante_v3.hpp',
  atacante_v4: '05-soccer/atacante_v4.hpp',
  danca_tempo: '08-motion/danca_tempo.hpp',
  simples: '08-motion/simples.hpp',
  diferencial: '08-motion/diferencial.hpp',
  linha_robotics: '08-motion/linha_robotics.hpp',
  maze_robotics: '08-motion/maze_robotics.hpp',
  soccer_robotics: '08-motion/soccer_robotics.hpp'
};

describe('EXAMPLES ↔ examples/*.hpp', () => {
  it('every library example maps to a .hpp file', () => {
    for (const ex of EXAMPLES) {
      expect(EXAMPLE_FILES[ex.id], ex.id).toBeTruthy();
    }
  });

  it('every mapped .hpp is byte-identical to the library (trimEnd)', () => {
    for (const ex of EXAMPLES) {
      const rel = EXAMPLE_FILES[ex.id];
      if (!rel) continue;
      const src = fs.readFileSync(path.join(EXAMPLES_DIR, rel), 'utf8');
      expect(src.trimEnd(), `${ex.id} ↔ ${rel}`).toBe(ex.code.trimEnd());
    }
  });
});
