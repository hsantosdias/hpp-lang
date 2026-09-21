import { describe, it, expect } from 'vitest';
import { compile, Program } from '../packages/hpp-lang/src/index';
import { HppRuntime } from '../packages/hpp-lang/src/runtime';
import { HPP_CORE_VERSION } from '../packages/hpp-lang/src/version';
import { checkRequirements, checkProgramActions, Capability } from '../packages/hpp-lang/src/capabilities';
import type { ActionSpec } from '../packages/hpp-lang/src/tokens';
import { SOCCER_EXTENSION } from '../packages/hpp-lang/src/extensions/soccer';
import { LINE_EXTENSION, MockLineHardware, lineError } from '../packages/hpp-lang/src/extensions/line';
import { MAZE_EXTENSION } from '../packages/hpp-lang/src/extensions/maze';
import { Hardware } from '../packages/hpp-lang/src/hardware';

/** Hardware mínimo: núcleo puro não precisa de domínio algum (§19). */
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

function progOf(src: string): Program {
  const { program, errors } = compile(src);
  expect(errors).toEqual([]);
  return program!;
}

describe('H++ versões separadas (§17)', () => {
  it('core, soccer e line têm versões independentes', () => {
    expect(HPP_CORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(SOCCER_EXTENSION.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(LINE_EXTENSION.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(SOCCER_EXTENSION.id).toBe('soccer');
    expect(LINE_EXTENSION.id).toBe('line');
  });
});

describe('H++ capabilities (§8)', () => {
  it('lista o que falta com mensagem em PT', () => {
    expect(checkRequirements(['motor'], ['motor', 'kicker'])).toEqual(['kicker']);
    const rt = new HppRuntime(bareHw(), ['motor'], 'line', '0.1.0');
    expect(rt.exigir('motor')).toBeNull();
    const msg = rt.exigir('kicker');
    expect(msg).toContain('kicker');
    expect(msg).toContain('line');
  });

  it('soccer declara bola/kicker/dribbler/rádio; line não', () => {
    expect(SOCCER_EXTENSION.capabilities).toContain('ball_sensor');
    expect(SOCCER_EXTENSION.capabilities).toContain('kicker');
    expect(LINE_EXTENSION.capabilities).toContain('line_sensor');
    expect(LINE_EXTENSION.capabilities).not.toContain('kicker');
    expect(LINE_EXTENSION.capabilities).not.toContain('ball_sensor');
  });
});

describe('HppRuntime (§7)', () => {
  it('conta ciclos, injeta ciclo/cycle e delega atuadores', () => {
    const log: string[] = [];
    const hw = bareHw();
    const origDrive = hw.drive;
    void origDrive;
    const rt = new HppRuntime(
      {
        ...hw,
        drive: (t) => log.push(`drive:${t}`)
      },
      ['motor'],
      'line',
      '0.1.0'
    );
    const p = progOf('ANDAR 0.5');
    expect(rt.ciclo).toBe(0);
    rt.runProgram(p);
    expect(rt.ciclo).toBe(1);
    expect(log).toEqual(['drive:0.5']);
    expect(rt.sensors().ciclo).toBe(1);
    expect(rt.versions()).toEqual({ core: HPP_CORE_VERSION, extension: '0.1.0', extensionId: 'line' });
  });

  it('núcleo roda sem nenhum domínio (isolamento §19)', () => {
    const rt = new HppRuntime(bareHw(), [], 'generic', '0.0.0');
    const p = progOf('n = 0\nREPETIR 3 VEZES\n  n = n + 1\nFIM');
    const r = rt.runProgram(p);
    expect(r.ok).toBe(true);
  });
});

describe('Extensibilidade: mock-line sem Soccer (§20)', () => {
  it('programa de linha roda sobre MockLineHardware (só core + line)', () => {
    const hw = new MockLineHardware();
    hw.lineValues = [0.8, 0.1, 0.0]; // linha à esquerda
    const rt = new HppRuntime(hw, [...LINE_EXTENSION.capabilities], LINE_EXTENSION.id, LINE_EXTENSION.version);
    const p = progOf('SE erro_linha < 0 ENTAO GIRAR 0.4 SENAO ANDAR 0.6 FIM');
    const r = rt.runProgram(p);
    expect(r.ok).toBe(true);
    expect(hw.log).toEqual(['turn:0.4']);
    hw.lineValues = [0.0, 0.1, 0.9]; // linha à direita
    rt.runProgram(p);
    expect(hw.log).toEqual(['turn:0.4', 'drive:0.6']);
  });

  it('lineError: centrado = 0, bordas = ±1', () => {
    expect(lineError({ values: [1, 1, 1] })).toBeCloseTo(0, 9);
    expect(lineError({ values: [1, 0, 0] })).toBeCloseTo(-1, 9);
    expect(lineError({ values: [0, 0, 1] })).toBeCloseTo(1, 9);
    expect(lineError({ values: [] })).toBe(0);
  });
});

describe('Maze: só contratos (§12)', () => {
  it('descritor existe sem lógica de navegação', () => {
    expect(MAZE_EXTENSION.id).toBe('maze');
    expect(MAZE_EXTENSION.capabilities).toContain('distance_sensor');
    expect(MAZE_EXTENSION.actions).toEqual(['drive', 'turn', 'stop']);
  });
});

describe('Reset em 3 níveis (§19/§20)', () => {
  it('Program.reset limpa memória; Runtime.reset limpa só o ciclo', () => {
    const logged: string[] = [];
    let primeiro = 0; // sensor evolui: 0 no 1º ciclo, 1 depois
    const hw = {
      ...bareHw(),
      sensors: () => ({ primeiro: primeiro++ > 0 ? 1 : 0 }),
      drive: (t: number) => logged.push(`drive:${t}`)
    };
    // Um único Program: memória vive entre runProgram do MESMO objeto
    const p = progOf('SE primeiro == 0 ENTAO n = 0 FIM\nSE n == 2 ENTAO ANDAR 1 SENAO ANDAR 0 FIM\nn = n + 1');
    const rt = new HppRuntime(hw, [], 'generic', '0.0.0');
    expect(rt.runProgram(p).ok).toBe(true); // ciclo 1: n = 0 → 1
    expect(rt.runProgram(p).ok).toBe(true); // ciclo 2: n = 1 → 2
    expect(rt.ciclo).toBe(2);
    rt.reset();
    expect(rt.ciclo).toBe(0);
    const r = rt.runProgram(p); // memória sobreviveu: n = 2 → anda 1
    expect(r.ok).toBe(true);
    expect(logged).toContain('drive:1');
    expect(rt.ciclo).toBe(1);
    p.reset(); // limpa a memória do aluno
    const r2 = rt.runProgram(p); // n indefinido → erro pedagógico
    expect(r2.ok).toBe(false);
    expect(r2.error!.message).toContain('n');
  });
});

describe('Ciclo conta mesmo com erro (§21)', () => {
  it('runProgram com erro ainda avança o ciclo (determinístico)', () => {
    const rt = new HppRuntime(bareHw(), [], 'generic', '0.0.0');
    const bad = progOf('x = x + 1'); // x não existe
    const r1 = rt.runProgram(bad);
    expect(r1.ok).toBe(false);
    expect(rt.ciclo).toBe(1);
    const r2 = rt.runProgram(bad);
    expect(r2.ok).toBe(false);
    expect(rt.ciclo).toBe(2);
  });
});

describe('Sensores reservados por snapshot (§13)', () => {
  it('atribuir nome de sensor dura só até o próximo snapshot', () => {
    const rt = new HppRuntime(
      { ...bareHw(), sensors: () => ({ tempo: 5 }) },
      [],
      'generic',
      '0.0.0'
    );
    // No mesmo ciclo, a atribuição vale:
    const same = progOf('tempo = 100\nSE tempo == 100 ENTAO ANDAR 1 FIM');
    const r = rt.runProgram(same);
    expect(r.ok).toBe(true);
    // No ciclo seguinte, o snapshot sobrescreve: tempo volta a 5
    const check = progOf('SE tempo == 100 ENTAO ANDAR 1 SENAO PARAR FIM');
    const logged: string[] = [];
    const hw3 = {
      ...bareHw(),
      sensors: () => ({ tempo: 5 }),
      drive: () => logged.push('drive'),
      stop: () => logged.push('stop')
    };
    const rt3 = new HppRuntime(hw3, [], 'generic', '0.0.0');
    rt3.runProgram(progOf('tempo = 100'));
    rt3.runProgram(check);
    expect(logged).toEqual(['stop']);
  });
});

describe('Capacidades por ação (§9/§49)', () => {
  it('soccer aceita tudo; line barra CHUTAR/DRIBLAR/RADIO com mensagem PT', () => {
    const kick = progOf('CHUTAR');
    expect(
      checkProgramActions(kick.statements, [...SOCCER_EXTENSION.capabilities], SOCCER_EXTENSION)
    ).toBeNull();
    // Fora do vocabulário do domínio: mensagem de ação desconhecida
    const noKick = checkProgramActions(kick.statements, [...LINE_EXTENSION.capabilities], LINE_EXTENSION);
    expect(noKick).toContain('CHUTAR');
    expect(noKick).toContain('desconhecida');
    const noDribble = checkProgramActions(
      progOf('DRIBLAR 1').statements,
      [...LINE_EXTENSION.capabilities],
      LINE_EXTENSION
    );
    expect(noDribble).toContain('DRIBLAR');
    const noRadio = checkProgramActions(
      progOf('ENVIAR_RADIO 1').statements,
      [...LINE_EXTENSION.capabilities],
      LINE_EXTENSION
    );
    expect(noRadio).toContain('ENVIAR_RADIO');
    const walk = progOf('ANDAR 0.5\nGIRAR 0.2\nPARAR');
    expect(checkProgramActions(walk.statements, [...LINE_EXTENSION.capabilities], LINE_EXTENSION)).toBeNull();
  });

  it('requires mapeia ação→capacidade mesmo dentro do vocabulário', () => {
    // Hardware que conhece CHUTAR mas não tem kicker: erro cita a capacidade
    const poor = { ...SOCCER_EXTENSION, capabilities: [] as Capability[] };
    const msg = checkProgramActions(progOf('CHUTAR').statements, [], poor);
    expect(msg).toContain('CHUTAR');
    expect(msg).toContain('kicker');
  });

  it('sensorRequires barra leitura sem capacidade (mensagem PT)', () => {
    const prog = progOf('SE bussola > 10 ENTAO GIRAR 1 FIM');
    const noCompass = checkProgramActions(prog.statements, ['motor'], SOCCER_EXTENSION);
    expect(noCompass).toContain('bussola');
    expect(noCompass).toContain('compass');
    const ok = checkProgramActions(prog.statements, ['motor', 'compass'], SOCCER_EXTENSION);
    expect(ok).toBeNull();
  });

  it('variável com nome de sensor não é barrada (sombreamento)', () => {
    const prog = progOf('bussola = 1\nSE bussola > 10 ENTAO GIRAR 1 FIM');
    expect(checkProgramActions(prog.statements, ['motor'], SOCCER_EXTENSION)).toBeNull();
  });

  it('soccer completo (incl. line_sensor) aceita programa atacante típico', () => {
    const prog = progOf(
      'SE ver_bola ENTAO MIRAR_BOLA ANDAR 0.6 SENAO GIRAR 0.4 FIM\n' +
        'SE linha_frente ENTAO PARAR FIM\n' +
        'SE ABS(direcao_gol) < 10 ENTAO CHUTAR FIM'
    );
    expect(
      checkProgramActions(prog.statements, [...SOCCER_EXTENSION.capabilities], SOCCER_EXTENSION)
    ).toBeNull();
  });

  it('verbos da extensão viram ação canônica e passam no gate do domínio', () => {
    const lineVerbs: Record<string, ActionSpec> = { SEGUIR: { name: 'drive', args: 1 } };
    const { program, errors } = compile('SEGUIR 0.5', { extraActions: lineVerbs });
    expect(errors).toEqual([]);
    expect(
      checkProgramActions(program!.statements, [...LINE_EXTENSION.capabilities], LINE_EXTENSION)
    ).toBeNull();
    // Mas CHUTAR continua fora do vocabulário line:
    expect(
      checkProgramActions(progOf('CHUTAR').statements, [...LINE_EXTENSION.capabilities], LINE_EXTENSION)
    ).toContain('desconhecida');
  });
});
