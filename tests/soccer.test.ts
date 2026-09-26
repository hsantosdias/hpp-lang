import { describe, it, expect } from 'vitest';
import { compile, HppRuntime, SOCCER_EXTENSION, Program } from '../packages/hpp-lang/src/index';
import { checkProgramActions, isMotionAction } from '../packages/hpp-lang/src/index';
import type { Hardware } from '../packages/hpp-lang/src/hardware';

const DT = 1 / 120;

function prog(src: string) {
  const c = compile(src, { extraActions: SOCCER_EXTENSION.verbs });
  expect(c.errors).toEqual([]);
  return c.program!;
}

function soccerHw(sensors: Record<string, number | boolean | string> = {}) {
  const log: string[] = [];
  const hw: Hardware = {
    sensors: () => ({ ...sensors }),
    drive: (t) => log.push(`drive:${t}`),
    turn: (s) => log.push(`turn:${s}`),
    stop: () => log.push('stop'),
    fire: () => log.push('fire'),
    aimMain: () => log.push('aimMain'),
    aimSecondary: () => log.push('aimSecondary'),
    radioSend: (m) => log.push(`radio:${m}`),
    dribble: (on) => log.push(`dribble:${on}`),
    motors: (l, r) => log.push(`motors:${l},${r}`)
  };
  const rt = new HppRuntime(hw, [...SOCCER_EXTENSION.capabilities], SOCCER_EXTENSION.id, SOCCER_EXTENSION.version);
  rt.dt = DT;
  return { hw, rt, log };
}

function runTilDone(rt: HppRuntime, p: Program, budget = 5000) {
  let r = rt.runProgram(p);
  for (let i = 0; i < budget && r.suspended; i++) r = rt.runProgram(p);
  return r;
}

describe('Soccer: primitivas Robotics no domínio futebol (§15/§16)', () => {
  it('ANDAR/VOLTAR/PARAR/GIRAR continuam funcionando como sempre', () => {
    const { rt, log } = soccerHw();
    expect(rt.runProgram(prog('ANDAR 0.7')).ok).toBe(true);
    expect(rt.runProgram(prog('VOLTAR 0.7')).ok).toBe(true);
    expect(rt.runProgram(prog('GIRAR 0.2')).ok).toBe(true);
    expect(rt.runProgram(prog('PARAR')).ok).toBe(true);
    expect(log).toEqual(['drive:0.7', 'drive:-0.7', 'turn:0.2', 'stop']);
  });

  it('comandos temporais rodam no relógio do runtime e param no fim (§6)', () => {
    const { rt, log } = soccerHw();
    const r = runTilDone(rt, prog('ANDAR_POR 0.5, 0.1\nGIRAR_POR 0.4, 0.1'));
    expect(r.suspended).toBe(false);
    expect(log).toEqual(['drive:0.5', 'stop', 'turn:0.4', 'stop']);
  });

  it('ESPERAR não toca o drivetrain do robô', () => {
    const { rt, log } = soccerHw();
    expect(runTilDone(rt, prog('ESPERAR 0.1\nANDAR 0.3')).suspended).toBe(false);
    expect(log).toEqual(['drive:0.3']);
  });

  it('MOTORES entra pelo drivetrain; MOTOR_ESQUERDO é barrado (§9/§15)', () => {
    const ok = soccerHw();
    expect(ok.rt.runProgram(prog('MOTORES 0.5, -0.5')).ok).toBe(true);
    expect(ok.log).toEqual(['motors:0.5,-0.5']);

    const msg = checkProgramActions(
      prog('MOTOR_ESQUERDO 0.5').statements,
      [...SOCCER_EXTENSION.capabilities],
      SOCCER_EXTENSION
    );
    expect(msg).toContain('MOTOR_ESQUERDO');
    expect(msg).toContain('motor_left');
    expect(SOCCER_EXTENSION.capabilities).not.toContain('motor_left');
    expect(SOCCER_EXTENSION.capabilities).not.toContain('motor_individual');
  });

  it('ANDAR_METROS usa a odometria real do Soccer (nunca finge)', () => {
    const { rt, log } = soccerHw({ encoder: 0 });
    const p = prog('ANDAR_METROS 0.5');
    const r1 = rt.runProgram(p);
    expect(r1.suspended).toBe(true);
    expect(log).toEqual(['drive:1']);
    // robô parado → encoder não muda → continua suspenso, sem concluir
    for (let i = 0; i < 50; i++) expect(rt.runProgram(p).suspended).toBe(true);
    expect(log).toEqual(['drive:1']);
  });
});

describe('Soccer: as ações de domínio seguem Soccer (§16/§19)', () => {
  it('CHUTAR/DRIBLAR/MIRAR_*/RADIO continuam no descritor soccer', () => {
    for (const a of ['kick', 'dribble', 'aimBall', 'aimGoal', 'radioSend'] as const) {
      expect(isMotionAction(a)).toBe(false);
      expect(SOCCER_EXTENSION.actions).toContain(a);
    }
  });

  it('primitivas de movimento são Robotics mesmo com a extensão soccer', () => {
    for (const a of ['drive', 'reverse', 'stop', 'turn', 'wait', 'driveFor', 'turnDegrees'] as const) {
      expect(isMotionAction(a)).toBe(true);
    }
    // Um descritor mínimo que NÃO lista drive ainda aceita ANDAR:
    const minimo = { id: 'x', actions: [] as string[], sensors: [] as string[] };
    expect(
      checkProgramActions(prog('ANDAR 0.5').statements, ['motor'], minimo)
    ).toBeNull();
    // ...mas CHUTAR continua fora de vocabulário:
    expect(
      checkProgramActions(prog('CHUTAR').statements, ['kicker'], minimo)
    ).toContain('desconhecida');
  });

  it('ações de domínio exigem a capability de domínio (§21)', () => {
    expect(checkProgramActions(prog('CHUTAR').statements, ['motor'], SOCCER_EXTENSION)).toContain('kicker');
    expect(checkProgramActions(prog('DRIBLAR 1').statements, ['motor'], SOCCER_EXTENSION)).toContain('dribbler');
    expect(checkProgramActions(prog('ENVIAR_RADIO 1').statements, ['motor'], SOCCER_EXTENSION)).toContain('radio');
    expect(checkProgramActions(prog('CHUTAR').statements, [...SOCCER_EXTENSION.capabilities], SOCCER_EXTENSION)).toBeNull();
  });

  it('exemplos progressivos do §29 compilam no domínio soccer', () => {
    const fontes = [
      'REPETIR 4 VEZES\n  ANDAR_POR 0.5, 1\n  GIRAR_POR 0.5, 1\n  VOLTAR_POR 0.5, 1\nFIM',
      'ANDAR 0.5\nESPERAR 2\nPARAR',
      'MOTORES 0.5, 0.5\nESPERAR 2\nMOTORES -0.5, 0.5\nESPERAR 1\nPARAR'
    ];
    for (const src of fontes) {
      const c = compile(src);
      expect(c.errors).toEqual([]);
      expect(c.program).toBeTruthy();
      expect(checkProgramActions(c.program!.statements, [...SOCCER_EXTENSION.capabilities], SOCCER_EXTENSION)).toBeNull();
    }
  });
});
