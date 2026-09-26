/**
 * HPP Robotics Motion — camada de movimento robótico universal da H++.
 *
 * ```text
 *                     H++
 *                      │
 *              ┌───────┴────────┐
 *           Robotics           Core (só linguagem)
 *              │
 *       ┌──────┼──────────┐
 *     Soccer   Line      Maze
 * ```
 *
 * Nenhum arquivo desta pasta importa domínio, simulador, Three.js, bola,
 * campo ou gol — provado por `tests/isolation.test.ts`.
 */
export {
  HPP_ROBOTICS_VERSION,
  MOTION_ACTIONS,
  TIMED_ACTIONS,
  SPATIAL_ACTIONS,
  MOTION_REQUIREMENTS,
  MOTION_STATE_SENSORS,
  ENCODER_SENSORS,
  HEADING_SENSORS,
  isMotionAction,
  missingMotionCapability,
  motionCapabilityError,
  MotionState
} from './motion.js';
export type { TimedKind, TimedPending, SpatialPending, PendingMotion } from './motion.js';

export { roboticsProfile } from './contracts.js';
export type {
  MotionCommand,
  MotionAction,
  MotionCapabilities,
  MotorCapabilities,
  EncoderCapabilities,
  LocomotionCapabilities,
  RoboticsProfile
} from './contracts.js';
