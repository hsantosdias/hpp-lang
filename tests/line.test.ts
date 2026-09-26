import { describe, it, expect } from 'vitest';
import { compile, HppRuntime, LINE_EXTENSION, MockLineHardware } from '../packages/hpp-lang/src/index';
import { checkProgramActions } from '../packages/hpp-lang/src/capabilities';

const DT = 1 / 120;

function prog(src: string) {
  const c = compile(src, { extraActions: LINE_EXTENSION.verbs });
  expect(c.errors).toEqual([]);
  return c.program!;
}

function lineRuntime() {
  const hw = new MockLineHardware();
  const rt = new HppRuntime(
    hw,
    [...LINE_EXTENSION.capabilities],
    LINE_EXTENSION.id,
    LINE_EXTENSION.version
  );
  return { hw, rt };
}

describe('Line: primitivas Robotics sem Soccer (§17/§26)', () => {
  it('programa de linha clássico usa ANDAR/GIRAR_* sem ação de domínio', () => {
    const src =
      'SE linha_esq E NÃO linha_dir ENTAO\n' +
      '  GIRAR_ESQUERDA 0.4\n' +
      'SENAO\n' +
      '  SE linha_dir E NÃO linha_esq ENTAO\n' +
      '    GIRAR_DIREITA 0.4\n' +
      '  SENAO\n' +
      '    ANDAR 0.5\n' +
      '  FIM\n' +
      'FIM';
    const p = prog(src);
    expect(checkProgramActions(p.statements, [...LINE_EXTENSION.capabilities], LINE_EXTENSION)).toBeNull();

    const { hw, rt } = lineRuntime();
    hw.lineValues = [0.8, 0.1, 0.0]; // linha só à esquerda
    expect(rt.runProgram(p).ok).toBe(true);
    expect(hw.log).toEqual(['turn:0.4']);

    hw.lineValues = [0.0, 0.1, 0.9]; // linha só à direita
    expect(rt.runProgram(p).ok).toBe(true);
    expect(hw.log).toEqual(['turn:0.4', 'turn:-0.4']);

    hw.lineValues = [0.0, 1.0, 0.0]; // centrado
    expect(rt.runProgram(p).ok).toBe(true);
    expect(hw.log).toEqual(['turn:0.4', 'turn:-0.4', 'drive:0.5']);
  });

  it('o domínio Line declara só o que ele precisa (§17/§20)', () => {
    expect(LINE_EXTENSION.capabilities).toEqual(['motor', 'encoder', 'line_sensor']);
    expect(LINE_EXTENSION.capabilities).not.toContain('kicker');
    expect(LINE_EXTENSION.capabilities).not.toContain('ball_sensor');
    expect(LINE_EXTENSION.capabilities).not.toContain('dribbler');
  });

  it('ação de domínio Soccer é recusada com mensagem didática', () => {
    const p = prog('CHUTAR');
    const msg = checkProgramActions(p.statements, [...LINE_EXTENSION.capabilities], LINE_EXTENSION);
    expect(msg).toContain('CHUTAR');
    expect(msg).toContain('desconhecida');
  });

  it('movimento temporal roda no relógio do HppRuntime (não bloqueante)', () => {
    const p = prog('ANDAR_POR 0.5, 0.1\nPARAR');
    const { hw, rt } = lineRuntime();
    rt.dt = DT;
    let r = rt.runProgram(p);
    expect(r.suspended).toBe(true);
    expect(hw.log).toEqual(['drive:0.5']);
    for (let i = 0; i < 200 && r.suspended; i++) r = rt.runProgram(p);
    expect(r.suspended).toBe(false);
    // concluiu (stop do temporal) e retomou no PARAR do programa (stop)
    expect(hw.log).toEqual(['drive:0.5', 'stop', 'stop']);
  });

  it('ANDAR_METROS no Line exige encoder real — MockLineHardware não o tem (§8)', () => {
    const { hw, rt } = lineRuntime();
    const r = rt.runProgram(prog('ANDAR_METROS 0.5'));
    expect(r.ok).toBe(false);
    expect(r.error!.message).toContain('encoder');
    expect(r.error!.message).toContain('não finge');
    expect(hw.log).toEqual([]);
  });

  it('capacidade `encoder` do Line é real: um hardware com encoder completa a meta', () => {
    const log: string[] = [];
    let encoder = 0;
    const rt = new HppRuntime(
      {
        sensors: () => ({ encoder }),
        drive: (t) => log.push(`drive:${t}`),
        turn: (s) => log.push(`turn:${s}`),
        stop: () => log.push('stop'),
        fire: () => {},
        aimMain: () => {},
        aimSecondary: () => {},
        radioSend: () => {},
        dribble: () => {}
      },
      [...LINE_EXTENSION.capabilities],
      LINE_EXTENSION.id,
      LINE_EXTENSION.version
    );
    rt.dt = DT;
    const p = prog('ANDAR_METROS 0.5');
    expect(rt.runProgram(p).suspended).toBe(true);
    expect(log).toEqual(['drive:1']);
    encoder = 1;
    expect(rt.runProgram(p).suspended).toBe(false);
    expect(log).toEqual(['drive:1', 'stop']);
  });
});
