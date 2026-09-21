import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC = path.resolve(__dirname, '../packages/hpp-lang/src');

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...tsFiles(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out.sort();
}

/**
 * Static isolation guard: the H++ core (+ robotics + extensions) must never
 * import the simulator, a 3D/UI framework, or ambient browser globals.
 * Domain adapters (e.g. ScriptController) live OUTSIDE this package.
 */
describe('isolation: no simulator/UI/3D imports in the package', () => {
  const files = tsFiles(SRC);
  it('scans every source file', () => {
    expect(files.length).toBeGreaterThan(10);
  });
  const FORBIDDEN = [
    'three',
    'react',
    'SimuladorSoccerInfrared',
    'src/lang/',
    'src/robots/',
    '../src/',
    'from \'src/',
    'window.',
    'document.',
    'blockly',
    '@soccer',
    'SoccerHardware',
    'ScriptController'
  ];
  for (const f of files) {
    it(path.relative(SRC, f), () => {
      const content = fs.readFileSync(f, 'utf8');
      for (const needle of FORBIDDEN) {
        expect(content, `${path.basename(f)} contains ${needle}`).not.toContain(needle);
      }
    });
  }
});

describe('isolation: line extension is soccer-free', () => {
  it('line/index.ts never mentions soccer', () => {
    const content = fs.readFileSync(path.join(SRC, 'extensions/line/index.ts'), 'utf8');
    expect(content.toLowerCase()).not.toContain('soccer');
  });
  it('maze/index.ts never mentions soccer', () => {
    const content = fs.readFileSync(path.join(SRC, 'extensions/maze/index.ts'), 'utf8');
    expect(content.toLowerCase()).not.toContain('soccer');
  });
  it('core files never mention domain ids', () => {
    for (const rel of ['ast.ts', 'tokens.ts', 'lexer.ts', 'parser.ts', 'interpreter.ts', 'errors.ts']) {
      const content = fs.readFileSync(path.join(SRC, rel), 'utf8');
      expect(content.toLowerCase()).not.toContain('soccer');
    }
  });
});
