import { ExtensionDescriptor } from '../../capabilities.js';

/**
 * Extensão Soccer (primeiro domínio, §10): descreve o vocabulário soccer
 * sem tocar no parser — sensores chegam por snapshot, ações pelo `Hardware`.
 */
export const SOCCER_EXT_VERSION = '0.4.0';

export const SOCCER_EXTENSION: ExtensionDescriptor = {
  id: 'soccer',
  version: SOCCER_EXT_VERSION,
  domain: 'Soccer Infrared',
  /**
   * Soccer declara o drivetrain diferencial do simulador (`MOTORES`) e
   * odometria por encoder (§15/§18). NÃO declara `motor_individual`/
   * `motor_left`/`motor_right`: o modelo simulado não tem rodas independentes
   * reais — `MOTOR_ESQUERDO` é barrado de propósito (§10/§32).
   */
  capabilities: [
    'motor', 'differential_drive', 'encoder',
    'compass', 'distance_sensor', 'ball_sensor',
    'radio', 'kicker', 'dribbler', 'line_sensor'
  ],
  sensors: [
    'ver_bola', 'see_ball',
    'direcao_bola', 'ball_dir',
    'direcao_gol', 'goal_dir',
    'dist_bola', 'ball_dist',
    'forca_sinal', 'signal',
    'setor_bola', 'ball_sector',
    'bussola', 'compass',
    'deriva_bussola', 'compass_drift',
    'dist_frente', 'dist_ahead',
    'tof_esq', 'tof_left',
    'tof_dir', 'tof_right',
    'linha_frente', 'line_front',
    'linha_tras', 'line_back',
    'linha_esq', 'line_left',
    'linha_dir', 'line_right',
    'encoder', 'odometria', 'odometry',
    'velocidade', 'speed',
    'velocidade_angular', 'angular_speed',
    'tempo', 'time',
    'tempo_total', 'total_time',
    'placar_eu', 'my_score',
    'placar_outro', 'foe_score',
    'fase', 'phase',
    'radio'
  ],
  actions: ['drive', 'turn', 'kick', 'stop', 'aimBall', 'aimGoal', 'radioSend', 'dribble'],
  /** Verificação por ação (§9): o resto (locomoção/mira de gol) não exige nada além do robô. */
  requires: {
    kick: ['kicker'],
    dribble: ['dribbler'],
    radioSend: ['radio'],
    aimBall: ['ball_sensor']
  },
  /**
   * Verificação por sensor: `direcao_gol` é geometria (sem exigência);
   * resto do jogo (tempo/placar/fase/radio) não exige capacidade.
   */
  sensorRequires: {
    ver_bola: ['ball_sensor'],
    see_ball: ['ball_sensor'],
    direcao_bola: ['ball_sensor'],
    ball_dir: ['ball_sensor'],
    dist_bola: ['ball_sensor'],
    ball_dist: ['ball_sensor'],
    forca_sinal: ['ball_sensor'],
    signal: ['ball_sensor'],
    setor_bola: ['ball_sensor'],
    ball_sector: ['ball_sensor'],
    bussola: ['compass'],
    compass: ['compass'],
    deriva_bussola: ['compass'],
    compass_drift: ['compass'],
    dist_frente: ['distance_sensor'],
    dist_ahead: ['distance_sensor'],
    tof_esq: ['distance_sensor'],
    tof_left: ['distance_sensor'],
    tof_dir: ['distance_sensor'],
    tof_right: ['distance_sensor'],
    linha_frente: ['line_sensor'],
    line_front: ['line_sensor'],
    linha_tras: ['line_sensor'],
    line_back: ['line_sensor'],
    linha_esq: ['line_sensor'],
    line_left: ['line_sensor'],
    linha_dir: ['line_sensor'],
    line_right: ['line_sensor'],
    encoder: ['encoder'],
    odometria: ['odometry'],
    odometry: ['odometry']
  }
};
