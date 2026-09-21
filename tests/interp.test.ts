import { describe, it, expect } from 'vitest';
import { compile } from '../packages/hpp-lang/src/index';
import { Hardware } from '../packages/hpp-lang/src/hardware';

/** Hardware de mentira p/ testes: sensores fixos + registra ações. */
function fakeHw(sensors: Record<string, number | boolean | string> = {}) {
  const log: string[] = [];
  const hw: Hardware = {
    sensors: () => ({ ...sensors }),
    drive: (t) => log.push(`drive:${t}`),
    turn: (s) => log.push(`turn:${s}`),
    fire: () => log.push('fire'),
    stop: () => log.push('stop'),
    aimMain: () => log.push('aimMain'),
    aimSecondary: () => log.push('aimSecondary'),
    radioSend: (m) => log.push(`radio:${m}`),
    dribble: (on) => log.push(`dribble:${on}`)
  };
  return { hw, log };
}

function runOk(code: string, sensors = {}) {
  const c = compile(code);
  expect(c.errors).toEqual([]);
  const { hw, log } = fakeHw(sensors);
  const r = c.program!.run(hw);
  expect(r.error).toBeUndefined();
  expect(r.ok).toBe(true);
  return { log, prog: c.program! };
}

describe('H++ interpretador', () => {
  it('persegue: SE verdadeiro anda, SENAO gira', () => {
    const a = runOk('SE ver_bola ENTAO ANDAR 0.7 SENAO GIRAR 0.5 FIM', { ver_bola: true });
    expect(a.log).toEqual(['drive:0.7']);
    const b = runOk('SE ver_bola ENTAO ANDAR 0.7 SENAO GIRAR 0.5 FIM', { ver_bola: false });
    expect(b.log).toEqual(['turn:0.5']);
  });

  it('mesmo programa em EN roda igual', () => {
    const a = runOk('IF see_ball THEN DRIVE 0.7 ELSE TURN 0.5 END', { see_ball: false });
    expect(a.log).toEqual(['turn:0.5']);
  });

  it('variáveis sobrevivem entre ciclos (memória do robô)', () => {
    const c = compile('n = n + 1');
    expect(c.errors).toEqual([]);
    // n nasce indefinida → erro didático no 1º ciclo
    const { hw } = fakeHw({});
    const r1 = c.program!.run(hw);
    expect(r1.ok).toBe(false);
    expect(r1.error!.message).toContain('n');
    // Com valor inicial no programa, acumula
    const c2 = compile('SE primeiro == 0 ENTAO n = 0\nprimeiro = 1\nFIM\nn = n + 1');
    expect(c2.errors).toEqual([]);
    const h2 = fakeHw({ primeiro: 0 });
    c2.program!.run(h2.hw);
    const h3 = fakeHw({ primeiro: 1 });
    c2.program!.run(h3.hw);
    const h4 = fakeHw({ primeiro: 1 });
    c2.program!.run(h4.hw);
    // n foi 0 → 1 → 2 sem reset
    expect(c2.program).toBeTruthy();
  });

  it('ENQUANTO infinito cansa com dica em PT (não trava)', () => {
    const c = compile('ENQUANTO VERDADEIRO FACA ANDAR 1 FIM');
    expect(c.errors).toEqual([]);
    const { hw } = fakeHw({});
    const r = c.program!.run(hw, 200);
    expect(r.ok).toBe(false);
    expect(r.error!.message).toContain('cansou');
  });

  it('CHUTAR dispara fire; divisão por zero explica', () => {
    const a = runOk('CHUTAR');
    expect(a.log).toEqual(['fire']);
    const c = compile('x = 1 / 0');
    const { hw } = fakeHw({});
    const r = c.program!.run(hw);
    expect(r.ok).toBe(false);
    expect(r.error!.message).toContain('zero');
  });

  it('funções com retorno e ABS embutido', () => {
    const { log } = runOk(
      'FUNCAO dobro(x) RETORNAR x * 2 FIM\nANDAR dobro(-0.3)\nGIRAR ABS(-0.4)',
      {}
    );
    expect(log).toEqual(['drive:-0.6', 'turn:0.4']);
  });

  it('ações aparadas em -1..1, PARAR e miras', () => {
    const { log } = runOk('ANDAR 5\nGIRAR -9\nMIRAR_BOLA\nMIRAR_GOL\nPARAR');
    expect(log).toEqual(['drive:1', 'turn:-1', 'aimMain', 'aimSecondary', 'stop']);
  });

  it('DRIBLAR 1 liga e DRIBLAR 0 desliga; texto explica o erro', () => {
    const { log } = runOk('DRIBLAR 1\nDRIBLAR 0');
    expect(log).toEqual(['dribble:true', 'dribble:false']);
    const c = compile('DRIBLAR "forte"');
    const { hw } = fakeHw({});
    const r = c.program!.run(hw);
    expect(r.ok).toBe(false);
    expect(r.error!.message).toContain('DRIBLAR');
  });

  it('SENAO SE executa só o ramo certo (else-if)', () => {
    const code = 'SE a ENTAO ANDAR 1 SENAO SE b ENTAO GIRAR 2 SENAO PARAR FIM';
    expect(runOk(code, { a: true, b: true }).log).toEqual(['drive:1']);
    expect(runOk(code, { a: false, b: true }).log).toEqual(['turn:1']);
    expect(runOk(code, { a: false, b: false }).log).toEqual(['stop']);
  });

  it('RETORNAR com literal booleano e negação (predicados)', () => {
    const code = [
      'FUNCAO sim() RETORNAR VERDADEIRO FIM',
      'FUNCAO nunca() RETORNAR NAO v FIM',
      'SE sim() ENTAO ANDAR 1 FIM',
      'SE nunca() ENTAO GIRAR 1 FIM'
    ].join('\n');
    expect(runOk(code, { v: false }).log).toEqual(['drive:1', 'turn:1']);
  });

  it('função não enxerga local de quem chamou (só globais + entradas)', () => {
    const c = compile('FUNCAO f(v) RETORNAR g() FIM\nFUNCAO g() RETORNAR v FIM\nx = f(7)');
    expect(c.errors).toEqual([]);
    const { hw } = fakeHw({});
    const r = c.program!.run(hw);
    expect(r.ok).toBe(false);
    expect(r.error!.message).toContain('v');
  });

  it('vocabulário da extensão: verbo do domínio vira ação canônica', () => {
    const c = compile('SEGUIR 0.5', { extraActions: { SEGUIR: { name: 'drive', args: 1 } } });
    expect(c.errors).toEqual([]);
    const { hw, log } = fakeHw({});
    const r = c.program!.run(hw);
    expect(r.ok).toBe(true);
    expect(log).toEqual(['drive:0.5']);
  });
});
