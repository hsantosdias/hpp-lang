import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { compile, HppRuntime, LINE_EXTENSION, MAZE_EXTENSION, MockLineHardware } from '../packages/hpp-lang/src/index';
import type { Hardware } from '../packages/hpp-lang/src/hardware';

/**
 * Fonte do Core/Robotics lida via `import.meta.glob` (Vite/Vitest) — sem
 * depender de `node:fs`, que não é parte do contrato da linguagem.
 */
const RAW = import.meta.glob('../packages/hpp-lang/src/**/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>;

const ALL_KEYS = Object.keys(RAW).sort();
/** Core + Robotics: sem extensões de domínio nem o barril que as junta. */
const CORE_KEYS = ALL_KEYS.filter((k) => !k.includes('/extensions/') && !k.endsWith('/index.ts'));

/** Remove comentários para checagens de texto não pegarem doc-comments. */
function code(key: string): string {
  return RAW[key].replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function specifiers(text: string): string[] {
  const out: string[] = [];
  const re = /(?:import|export)\s+[^'"()]*?from\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  const side = /\bimport\s*['"]([^'"]+)['"]/g;
  while ((m = side.exec(text)) !== null) out.push(m[1]);
  return out;
}

describe('Isolamento multidomínio (§3/§26)', () => {
  it('Core + Robotics não importam domínio, simulação nem framework 3D', () => {
    expect(CORE_KEYS.length).toBeGreaterThan(8);
    const forbidden = /(soccer|ball|goal|field|three|robots|game)/i;
    for (const key of CORE_KEYS) {
      for (const spec of specifiers(code(key))) {
        expect(spec, `${key} importa ${spec}`).toMatch(/^\.\.?[/\\]/);
        expect(spec, `${key} importa domínio externo ${spec}`).not.toMatch(forbidden);
      }
    }
  });

  it('nenhum arquivo do hpp-lang depende da aplicação (src/) ou de three.js', () => {
    for (const key of ALL_KEYS) {
      for (const spec of specifiers(code(key))) {
        expect(spec, `${key} importa ${spec}`).not.toMatch(/^three($|\/)/);
        expect(spec, `${key} importa a aplicação ${spec}`).not.toMatch(/^\.\.[/\\]\.\.[/\\]src/);
      }
    }
  });

  it('Core/Robotics não contêm nem importam SoccerHardware/Ball/Goal', () => {
    const forbidden = /(SoccerHardware|InfraredBall|InfraredSensor|\bGoal\b|\bBall\b)/;
    for (const key of CORE_KEYS) {
      expect(code(key), key).not.toMatch(forbidden);
    }
  });
});

describe('Tempo determinístico no Core (§6/§28)', () => {
  it('nenhum sleep/setTimeout/await/busy-wait nem relógio de parede', () => {
    const forbidden = /(setTimeout|setInterval|Date\.now|performance\.now|\basync\b|\bawait\b|\bsleep\s*\()/;
    for (const key of ALL_KEYS) {
      expect(code(key), key).not.toMatch(forbidden);
    }
  });
});

describe('Line executa as primitivas sem importar Soccer (§26)', () => {
  it('seguidor de linha anda/gira/para só com Core + Robotics + Line', () => {
    const hw = new MockLineHardware();
    hw.lineValues = [0.8, 0.1, 0.0];
    const rt = new HppRuntime(hw, [...LINE_EXTENSION.capabilities], LINE_EXTENSION.id, LINE_EXTENSION.version);
    rt.dt = 1 / 120;
    const { program, errors } = compile('SE erro_linha < 0 ENTAO GIRAR 0.4 SENAO ANDAR 0.6 FIM');
    expect(errors).toEqual([]);
    expect(rt.runProgram(program!).ok).toBe(true);
    expect(hw.log).toEqual(['turn:0.4']);
  });

  it('o mock de linha não expõe nada de Soccer', () => {
    const hw = new MockLineHardware();
    expect(Object.keys(hw)).not.toContain('kickCommand');
    expect(Object.keys(hw)).not.toContain('dribblerCommand');
    expect(Object.keys(hw.sensors())).toEqual(
      expect.arrayContaining(['linha_esq', 'linha_centro', 'linha_dir', 'erro_linha'])
    );
  });

  it('Line roda temporal (§6) sem bloquear e sem importar Soccer', () => {
    const hw = new MockLineHardware();
    const rt = new HppRuntime(hw, [...LINE_EXTENSION.capabilities], LINE_EXTENSION.id, LINE_EXTENSION.version);
    rt.dt = 1 / 120;
    const { program, errors } = compile('ANDAR_POR 0.5, 0.1\nPARAR');
    expect(errors).toEqual([]);

    let r = rt.runProgram(program!);
    expect(r.suspended).toBe(true);
    expect(hw.log).toEqual(['drive:0.5']); // não travou: suspendeu o programa
    for (let i = 0; i < 200 && r.suspended; i++) r = rt.runProgram(program!);
    expect(r.suspended).toBe(false);
    expect(hw.log).toEqual(['drive:0.5', 'stop', 'stop']);
  });
});

describe('Maze evolui de forma independente (§26)', () => {
  it('programa Maze anda/gira/para num hardware próprio, sem Soccer', () => {
    const log: string[] = [];
    const hw: Hardware = {
      sensors: () => ({ dist_frente: 1, bussola: 0 }),
      drive: (t) => log.push(`drive:${t}`),
      turn: (s) => log.push(`turn:${s}`),
      stop: () => log.push('stop'),
      fire: () => {},
      aimMain: () => {},
      aimSecondary: () => {},
      radioSend: () => {},
      dribble: () => {}
    };
    const rt = new HppRuntime(hw, [...MAZE_EXTENSION.capabilities], MAZE_EXTENSION.id, MAZE_EXTENSION.version);
    const { program, errors } = compile('ANDAR 0.5\nGIRAR 0.2\nPARAR');
    expect(errors).toEqual([]);
    expect(rt.runProgram(program!).ok).toBe(true);
    expect(log).toEqual(['drive:0.5', 'turn:0.2', 'stop']);
  });

  it('Maze mede o giro de verdade na bússola (§8), sem Soccer', () => {
    const log: string[] = [];
    let heading = 0;
    const rt = new HppRuntime(
      {
        sensors: () => ({ bussola: heading, dist_frente: 1, encoder: 0 }),
        drive: (t) => log.push(`drive:${t}`),
        turn: (s) => log.push(`turn:${s}`),
        stop: () => log.push('stop'),
        fire: () => {},
        aimMain: () => {},
        aimSecondary: () => {},
        radioSend: () => {},
        dribble: () => {}
      },
      [...MAZE_EXTENSION.capabilities],
      MAZE_EXTENSION.id,
      MAZE_EXTENSION.version
    );
    rt.dt = 1 / 120;
    const { program, errors } = compile('GIRAR_GRAUS 90');
    expect(errors).toEqual([]);

    expect(rt.runProgram(program!).suspended).toBe(true);
    expect(log).toEqual(['turn:1']); // começou a girar e suspendeu

    heading = 90; // o mundo girou de verdade — aí sim "chegou"
    expect(rt.runProgram(program!).suspended).toBe(false);
    expect(log).toEqual(['turn:1', 'stop']);
  });

  it('sem bússola o Maze não finge que chegou (§8)', () => {
    const log: string[] = [];
    const rt = new HppRuntime(
      {
        sensors: () => ({ dist_frente: 1, encoder: 0 }),
        drive: (t) => log.push(`drive:${t}`),
        turn: (s) => log.push(`turn:${s}`),
        stop: () => log.push('stop'),
        fire: () => {},
        aimMain: () => {},
        aimSecondary: () => {},
        radioSend: () => {},
        dribble: () => {}
      },
      [...MAZE_EXTENSION.capabilities],
      MAZE_EXTENSION.id,
      MAZE_EXTENSION.version
    );
    const { program, errors } = compile('GIRAR_GRAUS 90');
    expect(errors).toEqual([]);
    const r = rt.runProgram(program!);
    expect(r.ok).toBe(false);
    expect(r.error!.message).toContain('bussola');
    expect(r.error!.message).toContain('não finge');
    expect(log).toEqual([]);
  });
});

/**
 * Guardas estticas complementares (fs): varredura literal de fonte — sem
 * depender de import.meta.glob, cobrem errors.ts e os arquivos novos.
 */
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
