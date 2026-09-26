/**
 * Sistema de capacidades (§8): vocabulário comum para descrever o que um
 * robô/hardware oferece, sem amarrar o núcleo a nenhum domínio.
 *
 * Ex.: Soccer tem {motor, ball_sensor, kicker, ...}; Line tem {motor, line_sensor}.
 */
import type { ActionName, ActionSpec } from './tokens.js';
import { ACTION_PT } from './tokens.js';
import type { Stmt, Expr } from './ast.js';
import { isMotionAction, missingMotionCapability } from './robotics/motion.js';

/**
 * O que um robô/hardware declara possuir. As cinco primeiras famílias são
 * as da camada Robotics (§20); o resto é capability de domínio.
 */
export type Capability =
  // locomoção / motores
  | 'motor'
  | 'motor_individual'
  | 'motor_left'
  | 'motor_right'
  | 'differential_drive'
  | 'holonomic_drive'
  // odometria
  | 'encoder'
  | 'odometry'
  // orientação
  | 'imu'
  | 'compass'
  // sensores
  | 'distance_sensor'
  | 'wall_detector'
  | 'line_sensor'
  | 'ball_sensor'
  // domínio soccer
  | 'radio'
  | 'kicker'
  | 'dribbler';

/** Descritor de extensão de domínio (soccer, line, maze, hardware...). */
export interface ExtensionDescriptor {
  /** Id estável, ex.: 'soccer'. */
  id: string;
  /** Versão da extensão (independente do core e do simulador). */
  version: string;
  /** Domínio legível, ex.: 'Soccer Infrared'. */
  domain: string;
  /** Capacidades que um hardware deste domínio pode oferecer. */
  capabilities: Capability[];
  /** Chaves de sensores (minúsculas) que a extensão define. */
  sensors: string[];
  /** Ações de DOMÍNIO que a extensão suporta. As primitivas Robotics
   * (ANDAR/VOLTAR/PARAR/GIRAR/ESPERAR/…) não precisam ser listadas: valem
   * em todo domínio (§33). */
  actions: string[];
  /**
   * Capacidades exigidas por ação (passo incremental rumo a descritores
   * completos de Sensor/Action; §12/§30). Ausente = sem verificação.
   * Ex.: `{ kick: ['kicker'], dribble: ['dribbler'] }`.
   */
  requires?: Partial<Record<ActionName, Capability[]>>;
  /**
   * Verbos do domínio: palavra (MAIÚSCULAS, sem acento) → ação canônica.
   * Dá a cada domínio seus verbos sem tocar a gramática do núcleo.
   * Ex. Line: `{ SEGUIR: { name: 'aimMain', args: 0 } }`.
   * Verbos do núcleo têm precedência sobre estes.
   */
  verbs?: Record<string, ActionSpec>;
  /**
   * Capacidades exigidas por SENSOR (leitura). Ausente = sem verificação.
   * Ex. soccer: `{ bussola: ['compass'], linha_frente: ['line_sensor'] }`.
   */
  sensorRequires?: Record<string, Capability[]>;
}

/** Lista o que falta em `have` para satisfazer `need`. Vazio = OK. */
export function checkRequirements(have: Capability[], need: Capability[]): Capability[] {
  return need.filter((c) => !have.includes(c));
}

/** Mensagem didática quando faltam capacidades. */
export function missingCapabilitiesMessage(missing: Capability[], extensionId: string): string {
  return (
    `Este programa precisa de: ${missing.join(', ')}. ` +
    `O robô atual (domínio "${extensionId}") não tem isso — ` +
    `troque de robô ou adapte o programa.`
  );
}

/** Coleta os nomes canônicos de ação usados num programa (AST já compilada). */
export function collectProgramActions(statements: Stmt[]): ActionName[] {
  const found = new Set<ActionName>();
  const walk = (list: Stmt[]): void => {
    for (const s of list) {
      switch (s.kind) {
        case 'action':
          found.add(s.name);
          break;
        case 'if':
          walk(s.then);
          walk(s.otherwise);
          break;
        case 'while':
        case 'repeat':
        case 'always':
          walk(s.body);
          break;
        case 'for':
          walk(s.body);
          break;
        case 'func':
          walk(s.body);
          break;
        default:
          break;
      }
    }
  };
  walk(statements);
  return [...found];
}

/**
 * Verifica se um programa cabe nas capacidades do hardware (§9/§32).
 * Retorna mensagem pedagógica ou null se OK. Não executa nada.
 * Quatro barreiras:
 * 1. ação fora do vocabulário da extensão — **exceto** as primitivas
 *    Robotics, que valem em qualquer domínio (§33);
 * 2. capacidades exigidas (via `requires`, semântica E) ausentes;
 * 3. capacidades da primitiva de movimento ausentes (semântica OU, §8);
 * 4. SENSORES exigidos (via `sensorRequires`) ausentes.
 * Sem entrada = sem verificação.
 */
export function checkProgramActions(
  statements: Stmt[],
  have: Capability[],
  extension: Pick<ExtensionDescriptor, 'id' | 'actions' | 'requires' | 'sensors' | 'sensorRequires'>
): string | null {
  const missing = new Set<Capability>();
  const anyOf = new Set<Capability>();
  const lacking: string[] = [];
  for (const name of collectProgramActions(statements)) {
    if (!isMotionAction(name) && !extension.actions.includes(name)) {
      lacking.push(`${ACTION_PT[name]} (ação desconhecida neste domínio)`);
      continue;
    }
    const need = extension.requires?.[name] ?? [];
    const absent = checkRequirements(have, need);
    const absentAny = missingMotionCapability(name, have) ?? [];
    if (absent.length > 0 || absentAny.length > 0) {
      lacking.push(ACTION_PT[name]);
      absent.forEach((c) => missing.add(c));
      absentAny.forEach((c) => anyOf.add(c));
    }
  }
  for (const name of collectProgramSensors(statements, extension.sensors)) {
    const need = extension.sensorRequires?.[name] ?? [];
    const absent = checkRequirements(have, need);
    if (absent.length > 0) {
      lacking.push(`${name} (sensor sem capacidade neste robô)`);
      absent.forEach((c) => missing.add(c));
    }
  }
  if (lacking.length === 0) return null;
  const needParts: string[] = [];
  if (missing.size > 0) needParts.push(`precisa de: ${[...missing].join(', ')}`);
  if (anyOf.size > 0) needParts.push(`precisa de uma entre: ${[...anyOf].join(' ou ')}`);
  const caps = needParts.length > 0 ? ` (${needParts.join('; ')})` : '';
  return (
    `Este programa usa ${lacking.join(', ')}, ` +
    `mas o robô atual não possui a capacidade necessária${caps}. ` +
    `Domínio "${extension.id}": troque de robô ou adapte o programa.`
  );
}

/**
 * Sensores lidos pelo programa: referências a variáveis que NÃO foram
 * declaradas no próprio programa (atribuição, parâmetro, laço, função),
 * filtradas pelo vocabulário de sensores da extensão. Limitação conhecida:
 * análise é do programa inteiro (não por fluxo) — sombrear um sensor com
 * variável de mesmo nome desliga a verificação para ele.
 */
export function collectProgramSensors(statements: Stmt[], vocabulary: string[]): string[] {
  const read = new Set<string>();
  const declared = new Set<string>();
  const walkExpr = (e: Expr): void => {
    switch (e.kind) {
      case 'var':
        read.add(e.name);
        break;
      case 'unary':
        walkExpr(e.expr);
        break;
      case 'binary':
        walkExpr(e.left);
        walkExpr(e.right);
        break;
      case 'call':
        for (const a of e.args) walkExpr(a);
        break;
      default:
        break;
    }
  };
  const walk = (list: Stmt[]): void => {
    for (const s of list) {
      switch (s.kind) {
        case 'assign':
          declared.add(s.name);
          walkExpr(s.expr);
          break;
        case 'func':
          declared.add(s.name);
          for (const p of s.params) declared.add(p);
          walk(s.body);
          break;
        case 'for':
          declared.add(s.name);
          walkExpr(s.from);
          walkExpr(s.to);
          if (s.step) walkExpr(s.step);
          walk(s.body);
          break;
        case 'if':
          walkExpr(s.cond);
          walk(s.then);
          walk(s.otherwise);
          break;
        case 'while':
          walkExpr(s.cond);
          walk(s.body);
          break;
        case 'repeat':
          walkExpr(s.count);
          walk(s.body);
          break;
        case 'always':
          walk(s.body);
          break;
        case 'return':
          if (s.expr) walkExpr(s.expr);
          break;
        case 'expr':
          walkExpr(s.expr);
          break;
        case 'action':
          for (const a of s.args) walkExpr(a);
          break;
        default:
          break;
      }
    }
  };
  walk(statements);
  const vocab = new Set(vocabulary);
  return [...read].filter((n) => !declared.has(n) && vocab.has(n));
}
