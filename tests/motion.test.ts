import { describe, it, expect } from 'vitest';
import { compile, Program } from '../packages/hpp-lang/src/index';
import { Hardware } from '../packages/hpp-lang/src/hardware';
import type { Capability } from '../packages/hpp-lang/src/capabilities';

/** Relógio determinístico do núcleo (§28): nunca Date.now(). */
const DT = 1 / 120;

interface Harness {
  log: string[];
  hw: Hardware;
  /** Mesmo objeto que o snapshot espelha — o teste pode mutar sensores. */
  sensors: Record<string, number | boolean | string>;
}

function harness(sensors: Record<string, number | boolean | string> = {}): Harness {
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
    motor: (id, v) => log.push(`motor:${id}:${v}`),
    motorLeft: (v) => log.push(`motorL:${v}`),
    motorRight: (v) => log.push(`motorR:${v}`),
    motors: (l, r) => log.push(`motors:${l},${r}`),
    moveLateral: (v) => log.push(`lateral:${v}`),
    moveXY: (x, y) => log.push(`xy:${x},${y}`)
  };
  return { log, hw, sensors };
}

function prog(src: string): Program {
  const c = compile(src);
  expect(c.errors).toEqual([]);
  return c.program!;
}

/** 1 ciclo, sem gate de capability (núcleo puro). */
function once(src: string, sensors: Record<string, number | boolean | string> = {}): string[] {
  const h = harness(sensors);
  const r = prog(src).run(h.hw, 5000, { dt: DT, capabilities: null });
  expect(r.error).toBeUndefined();
  return h.log;
}

/** 1 ciclo com capabilities declaradas (gate ligado). */
function onceCapped(src: string, caps: Capability[], sensors: Record<string, number | boolean | string> = {}) {
  const h = harness(sensors);
  const r = prog(src).run(h.hw, 5000, { dt: DT, capabilities: caps });
  return { r, log: h.log };
}

/** Roda até o programa não estar mais suspenso (ou estourar o orçamento). */
function untilDone(p: Program, h: Harness, budget = 5000) {
  let r = p.run(h.hw, 5000, { dt: DT, capabilities: null });
  for (let i = 0; i < budget && r.suspended; i++) {
    r = p.run(h.hw, 5000, { dt: DT, capabilities: null });
  }
  return r;
}

describe('Robotics: movimento básico (§5)', () => {
  it('ANDAR manda drive, PARAR manda stop, GIRAR manda turn', () => {
    expect(once('ANDAR 0.5')).toEqual(['drive:0.5']);
    expect(once('PARAR')).toEqual(['stop']);
    expect(once('GIRAR 0.5')).toEqual(['turn:0.5']);
  });

  it('VOLTAR v é semanticamente drive(-v) — física não é duplicada (§5.2)', () => {
    expect(once('VOLTAR 0.5')).toEqual(['drive:-0.5']);
    expect(once('ANDAR -0.5')).toEqual(['drive:-0.5']);
  });

  it('GIRAR positivo = esquerda; VIRAR/GIRAR_ESQUERDA e *_DIREITA reusam turn (§5.5/5.6)', () => {
    expect(once('GIRAR_ESQUERDA 0.3')).toEqual(['turn:0.3']);
    expect(once('VIRAR_ESQUERDA 0.3')).toEqual(['turn:0.3']);
    expect(once('GIRAR_DIREITA 0.3')).toEqual(['turn:-0.3']);
    expect(once('VIRAR_DIREITA 0.3')).toEqual(['turn:-0.3']);
  });

  it('aliases EN são exatamente equivalentes aos PT (§22)', () => {
    expect(once('DRIVE 0.5')).toEqual(once('ANDAR 0.5'));
    expect(once('REVERSE 0.5')).toEqual(once('VOLTAR 0.5'));
    expect(once('STOP')).toEqual(once('PARAR'));
    expect(once('TURN 0.5')).toEqual(once('GIRAR 0.5'));
    expect(once('TURN_LEFT 0.5')).toEqual(once('VIRAR_ESQUERDA 0.5'));
    expect(once('RIGHT_MOTOR 0.5')).toEqual(once('MOTOR_DIREITO 0.5'));
  });

  it('velocidade é limitada ao intervalo -1..1', () => {
    expect(once('ANDAR 5')).toEqual(['drive:1']);
    expect(once('GIRAR -9')).toEqual(['turn:-1']);
  });
});

describe('Robotics: movimento temporal não bloqueante (§6/§28)', () => {
  it('ANDAR_POR suspende o programa, mantém o motor ligado e conclui com stop', () => {
    const h = harness();
    const p = prog('ANDAR_POR 0.5, 1');
    const first = p.run(h.hw, 5000, { dt: DT, capabilities: null });
    expect(first.ok).toBe(true);
    expect(first.suspended).toBe(true);
    expect(h.log).toEqual(['drive:0.5']);
    const last = untilDone(p, h);
    expect(last.suspended).toBe(false);
    expect(h.log).toEqual(['drive:0.5', 'stop']);
  });

  it('ESPERAR não toca motor nenhum e o robô nunca congela o runtime', () => {
    const h = harness();
    const p = prog('ESPERAR 0.5\nPARAR');
    const last = untilDone(p, h);
    expect(last.ok).toBe(true);
    expect(last.suspended).toBe(false);
    expect(h.log).toEqual(['stop']);
  });

  it('VOLTAR_POR e GIRAR_POR usam o mesmo relógio e param no fim', () => {
    const h = harness();
    const p = prog('VOLTAR_POR 0.4, 0.1\nGIRAR_POR 0.6, 0.1');
    const last = untilDone(p, h);
    expect(last.suspended).toBe(false);
    expect(h.log).toEqual(['drive:-0.4', 'stop', 'turn:0.6', 'stop']);
  });

  it('temporais funcionam dentro de REPETIR (o laço sobrevive à suspensão)', () => {
    const h = harness();
    const p = prog('REPETIR 2 VEZES\n  ANDAR_POR 0.5, 0.1\n  GIRAR_POR 0.5, 0.1\nFIM');
    const last = untilDone(p, h);
    expect(last.suspended).toBe(false);
    expect(h.log).toEqual([
      'drive:0.5', 'stop',
      'turn:0.5', 'stop',
      'drive:0.5', 'stop',
      'turn:0.5', 'stop'
    ]);
  });

  it('temporais funcionam dentro de SE (suspensão no meio do ramo)', () => {
    const h = harness();
    const p = prog('SE 1 == 1 ENTAO ESPERAR 0.1 ANDAR 0.2 FIM');
    const last = untilDone(p, h);
    expect(last.suspended).toBe(false);
    expect(h.log).toEqual(['drive:0.2']);
  });

  it('duração 0 não vira movimento; PARAR_POR 0 ainda emite stop', () => {
    expect(once('ESPERAR 0')).toEqual([]);
    expect(once('ANDAR_POR 1, 0')).toEqual([]);
    expect(once('PARAR_POR 0')).toEqual(['stop']);
  });

  it('tempo negativo é erro didático em português com linha', () => {
    const h = harness();
    const r = prog('ESPERAR -1').run(h.hw, 5000, { dt: DT, capabilities: null });
    expect(r.ok).toBe(false);
    expect(r.error!.line).toBe(1);
    expect(r.error!.message).toContain('ESPERAR');
  });

  it('o núcleo não usa relógio de parede nem espera (§6/§28)', () => {
    // Garantido por construção: o tempo vem de `dt` por ciclo.
    const h = harness();
    const p = prog('ANDAR_POR 1, 100');
    const t0 = Date.now();
    for (let i = 0; i < 50; i++) p.run(h.hw, 5000, { dt: DT, capabilities: null });
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(h.log).toEqual(['drive:1']);
  });
});

describe('Robotics: movimento por distância/ângulo (§8)', () => {
  it('ANDAR_METROS só conclui quando o encoder real cruza a meta', () => {
    const h = harness({ encoder: 0 });
    const p = prog('ANDAR_METROS 0.5\nPARAR');
    const r1 = p.run(h.hw, 5000, { dt: DT, capabilities: ['encoder'] });
    expect(r1.suspended).toBe(true);
    expect(h.log).toEqual(['drive:1']);
    h.sensors.encoder = 0.2;
    const r2 = p.run(h.hw, 5000, { dt: DT, capabilities: ['encoder'] });
    expect(r2.suspended).toBe(true);
    expect(h.log).toEqual(['drive:1']); // nada de "cheguei" prematuro
    h.sensors.encoder = 0.6;
    const r3 = p.run(h.hw, 5000, { dt: DT, capabilities: ['encoder'] });
    expect(r3.suspended).toBe(false);
    expect(h.log).toEqual(['drive:1', 'stop', 'stop']);
  });

  it('VOLTAR_METROS anda de ré até a meta', () => {
    const h = harness({ encoder: 0 });
    const p = prog('VOLTAR_METROS 0.3');
    p.run(h.hw, 5000, { dt: DT, capabilities: ['encoder'] });
    expect(h.log).toEqual(['drive:-1']);
    h.sensors.encoder = -1;
    const r = p.run(h.hw, 5000, { dt: DT, capabilities: ['encoder'] });
    expect(r.suspended).toBe(false);
    expect(h.log).toEqual(['drive:-1', 'stop']);
  });

  it('sem odometria o comando falha em português e NUNCA finge chegada (§8)', () => {
    const h = harness(); // nenhum encoder no snapshot
    const r = prog('ANDAR_METROS 0.5').run(h.hw, 5000, { dt: DT, capabilities: ['encoder'] });
    expect(r.ok).toBe(false);
    expect(r.error!.line).toBe(1);
    expect(r.error!.message).toContain('encoder');
    expect(r.error!.message).toContain('não finge');
    expect(h.log).toEqual([]); // nem chegou a andar
  });

  it('GIRAR_GRAUS acumula ângulo real e aceita mais de 180°', () => {
    const h = harness({ bussola: 0 });
    const p = prog('GIRAR_GRAUS 270\nPARAR');
    p.run(h.hw, 5000, { dt: DT, capabilities: ['compass'] });
    expect(h.log).toEqual(['turn:1']);
    h.sensors.bussola = 100;
    expect(p.run(h.hw, 5000, { dt: DT, capabilities: ['compass'] }).suspended).toBe(true);
    h.sensors.bussola = 200;
    expect(p.run(h.hw, 5000, { dt: DT, capabilities: ['compass'] }).suspended).toBe(true);
    expect(h.log).toEqual(['turn:1']);
    h.sensors.bussola = 300; // 0 → 100 → 200 → 300 = 300° ≥ 270°
    const r = p.run(h.hw, 5000, { dt: DT, capabilities: ['compass'] });
    expect(r.suspended).toBe(false);
    expect(h.log).toEqual(['turn:1', 'stop', 'stop']);
  });

  it('GIRAR_GRAUS negativo gira para a direita', () => {
    const h = harness({ bussola: 0 });
    const p = prog('GIRAR_GRAUS -45');
    p.run(h.hw, 5000, { dt: DT, capabilities: ['compass'] });
    expect(h.log).toEqual(['turn:-1']);
    h.sensors.bussola = -45;
    expect(p.run(h.hw, 5000, { dt: DT, capabilities: ['compass'] }).suspended).toBe(false);
  });

  it('aceita odometry (semântica OU) lendo o sensor `odometria`', () => {
    const h = harness({ odometria: 0 });
    const p = prog('ANDAR_METROS 1');
    const r1 = p.run(h.hw, 5000, { dt: DT, capabilities: ['odometry'] });
    expect(r1.ok).toBe(true);
    expect(r1.suspended).toBe(true);
    h.sensors.odometria = 2;
    const r2 = p.run(h.hw, 5000, { dt: DT, capabilities: ['odometry'] });
    expect(r2.suspended).toBe(false);
  });

  it('sem capability a mensagem cita as opções (encoder ou odometry)', () => {
    const { r } = onceCapped('ANDAR_METROS 0.5', []);
    expect(r.ok).toBe(false);
    expect(r.error!.message).toContain('ANDAR_METROS');
    expect(r.error!.message).toContain('encoder');
    expect(r.error!.message).toContain('odometry');
  });
});

describe('Robotics: controle de motores (§9/§11)', () => {
  it('MOTORES exige differential_drive e a mensagem vem em português', () => {
    const { r } = onceCapped('MOTORES 0.5, 0.5', []);
    expect(r.ok).toBe(false);
    expect(r.error!.message).toContain('MOTORES');
    expect(r.error!.message).toContain('differential_drive');
    expect(r.error!.line).toBe(1);
  });

  it('MOTORES roda quando a capability está declarada (par de rodas)', () => {
    const { r, log } = onceCapped('MOTORES 0.5, -0.5', ['differential_drive']);
    expect(r.ok).toBe(true);
    expect(log).toEqual(['motors:0.5,-0.5']);
  });

  it('MOTOR_ESQUERDO é barrado num robô que só tem motor (§9/§10)', () => {
    const { r } = onceCapped('MOTOR_ESQUERDO 0.5', ['motor']);
    expect(r.ok).toBe(false);
    expect(r.error!.message).toContain('motor_left');
    const ok = onceCapped('MOTOR_ESQUERDO 0.5', ['motor_left']);
    expect(ok.r.ok).toBe(true);
    expect(ok.log).toEqual(['motorL:0.5']);
  });

  it('MOTOR id, velocidade usa o id cru (não é velocidade -1..1)', () => {
    const { r, log } = onceCapped('MOTOR 2, 0.5', ['motor_individual']);
    expect(r.ok).toBe(true);
    expect(log).toEqual(['motor:2:0.5']);
    const bad = onceCapped('MOTOR 2, 0.5', []);
    expect(bad.r.error!.message).toContain('motor_individual');
  });

  it('CURVA combina throttle+steer (§13) e exige motor', () => {
    const { r, log } = onceCapped('CURVA 0.6, 0.3', ['motor']);
    expect(r.ok).toBe(true);
    expect(log).toEqual(['drive:0.6', 'turn:0.3']);
    expect(onceCapped('CURVA 0.6, 0.3', []).r.error!.message).toContain('motor');
  });

  it('MOVER_LATERAL/MOVER_XY exigem holonomic_drive (§12) e não são obrigatórios no Soccer', () => {
    const { r, log } = onceCapped('MOVER_LATERAL 0.5', ['holonomic_drive']);
    expect(r.ok).toBe(true);
    expect(log).toEqual(['lateral:0.5']);
    expect(onceCapped('MOVER_LATERAL 0.5', ['motor']).r.error!.message).toContain('holonomic_drive');
    expect(onceCapped('MOVER_XY 0.5, 0.2', ['holonomic_drive']).log).toEqual(['xy:0.5,0.2']);
  });

  it('sem capability nenhuma ação de motor chega ao hardware', () => {
    const { r, log } = onceCapped('MOTOR_DIREITO 1', []);
    expect(r.ok).toBe(false);
    expect(log).toEqual([]);
  });
});

describe('Robotics: estado do movimento (§14)', () => {
  it('esta_andando fica verdadeiro depois de um movimento contínuo', () => {
    const h = harness({ fase: 0 });
    const p = prog('SE fase == 0 ENTAO ANDAR 0.5 SENAO SE esta_andando ENTAO PARAR SENAO GIRAR 1 FIM');
    p.run(h.hw, 5000, { dt: DT, capabilities: null });
    expect(h.log).toEqual(['drive:0.5']);
    h.sensors.fase = 1;
    p.run(h.hw, 5000, { dt: DT, capabilities: null });
    expect(h.log).toEqual(['drive:0.5', 'stop']); // enxergou esta_andando
  });

  it('esta_parado é verdadeiro antes de qualquer comando; VOLTAR conta como andando', () => {
    expect(once('SE esta_parado ENTAO ANDAR 1 FIM')).toEqual(['drive:1']);
    expect(once('SE esta_andando ENTAO ANDAR 1 FIM')).toEqual([]);
    const h = harness({ fase: 0 });
    const p = prog('SE fase == 0 ENTAO VOLTAR 0.5 SENAO SE esta_andando ENTAO PARAR FIM');
    p.run(h.hw, 5000, { dt: DT, capabilities: null });
    h.sensors.fase = 1;
    p.run(h.hw, 5000, { dt: DT, capabilities: null });
    expect(h.log).toEqual(['drive:-0.5', 'stop']);
  });

  it('esta_girando reflete o último turn', () => {
    const h = harness({ fase: 0 });
    const p = prog('SE fase == 0 ENTAO GIRAR 0.5 SENAO SE esta_girando ENTAO PARAR FIM');
    p.run(h.hw, 5000, { dt: DT, capabilities: null });
    h.sensors.fase = 1;
    p.run(h.hw, 5000, { dt: DT, capabilities: null });
    expect(h.log).toEqual(['turn:0.5', 'stop']);
  });

  it('movimento_concluido é verdadeiro no ciclo em que o temporal termina', () => {
    const h = harness();
    const p = prog('ESPERAR 0.1\nSE movimento_concluido ENTAO PARAR SENAO ANDAR 1 FIM');
    const last = untilDone(p, h);
    expect(last.ok).toBe(true);
    expect(h.log).toEqual(['stop']);
  });

  it('movimento_ativo acompanha a movimentação contínua', () => {
    expect(once('SE movimento_ativo ENTAO PARAR SENAO ANDAR 1 FIM')).toEqual(['drive:1']);
    expect(once('SE movimento_ativo ENTAO ANDAR 1 SENAO PARAR FIM')).toEqual(['stop']);
  });

  it('aliases EN dos sensores de estado funcionam (§14/§22)', () => {
    expect(once('IF is_stopped THEN DRIVE 1 END')).toEqual(['drive:1']);
    expect(once('IF motion_done THEN DRIVE 1 END')).toEqual([]);
    expect(once('IF motion_active THEN DRIVE 1 END')).toEqual([]);
  });
});

describe('Robotics: vocabulário e semântica (§1/§4)', () => {
  it('todas as primitivas de movimento estão no vocabulário PT e EN', () => {
    const casos: Array<[string, string]> = [
      ['ANDAR 1', 'DRIVE 1'],
      ['VOLTAR 1', 'REVERSE 1'],
      ['PARAR', 'STOP'],
      ['GIRAR 1', 'TURN 1'],
      ['ANDAR_POR 1, 1', 'DRIVE_FOR 1, 1'],
      ['VOLTAR_POR 1, 1', 'REVERSE_FOR 1, 1'],
      ['GIRAR_POR 1, 1', 'TURN_FOR 1, 1'],
      ['PARAR_POR 1', 'STOP_FOR 1'],
      ['ESPERAR 1', 'WAIT 1'],
      ['ANDAR_METROS 1', 'DRIVE_METERS 1'],
      ['VOLTAR_METROS 1', 'REVERSE_METERS 1'],
      ['GIRAR_GRAUS 90', 'TURN_DEGREES 90'],
      ['MOTOR_ESQUERDO 1', 'LEFT_MOTOR 1'],
      ['MOTOR_DIREITO 1', 'RIGHT_MOTOR 1'],
      ['MOTORES 1, 1', 'MOTORS 1, 1'],
      ['CURVA 1, 0.5', 'CURVE 1, 0.5'],
      ['MOVER_LATERAL 1', 'MOVE_LATERAL 1'],
      ['MOVER_XY 1, 1', 'MOVE_XY 1, 1']
    ];
    for (const [pt, en] of casos) {
      expect(prog(pt).statements).toEqual(prog(en).statements);
    }
  });

  it('sintaxe aceita vírgula e espaço entre argumentos (§9)', () => {
    expect(prog('MOTORES 0.5, 0.7').statements).toEqual(prog('MOTORES 0.5 0.7').statements);
    expect(prog('MOTOR 1 0.5').statements).toEqual(prog('MOTOR 1, 0.5').statements);
  });

  it('erro de arity em ação temporal cita o exemplo certo', () => {
    const c = compile('ANDAR_POR 0.5');
    expect(c.errors.some((e) => e.message.includes('0.5, 2'))).toBe(true);
    expect(c.program).toBeNull();
  });
});
