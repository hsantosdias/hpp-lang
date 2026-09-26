# H++ Capabilities

Common vocabulary describing what a robot/hardware offers, without tying the
core to any domain (`src/capabilities.ts`).

## Capabilities

`motor | motor_individual | motor_left | motor_right | differential_drive |
holonomic_drive | encoder | odometry | imu | compass | distance_sensor |
wall_detector | line_sensor | ball_sensor | radio | kicker | dribbler`

## API

- `checkRequirements(have, need)`: lists what's missing (empty = OK).
- `missingCapabilitiesMessage(missing, extensionId)`: PT explanation.
- `collectProgramActions(statements)`: canonical actions used by a program.
- `collectProgramSensors(statements, vocabulary)`: sensor reads = referenced
  variables never declared in the program, filtered by the extension's sensor
  vocabulary. Shadowing a sensor with a same-named variable disables the
  check for it (known, documented limitation: whole-program analysis).
- `checkProgramActions(statements, have, extension)`: three barriers —
  action outside the domain vocabulary, missing per-action `requires`, and
  missing per-sensor `sensorRequires`. Returns a PT message or `null`.

## Extension fields for gating

- `requires`: per-action capabilities, e.g. soccer
  `{ kick: ['kicker'], dribble: ['dribbler'], radioSend: ['radio'],
  aimBall: ['ball_sensor'] }`.
- `sensorRequires`: per-sensor capabilities, e.g. `bussola → compass`,
  `linha_* → line_sensor`.
- Hosts call the gate at install time (`setSource` pattern): incompatible
  programs are rejected with a pedagogical error instead of failing silently.

## Movement gate (`MOTION_REQUIREMENTS`)

The Robotics Motion layer keeps its own table (`src/robotics/motion.ts`) with
**OR** semantics — one of the listed capabilities satisfies the action:

| Action | Accepted (OR) |
|---|---|
| `driveMeters` / `reverseMeters` | `encoder` \| `odometry` |
| `turnDegrees` | `encoder` \| `odometry` \| `compass` \| `imu` |
| `motor` / `motorLeft` / `motorRight` | `motor_individual` \| `motor_left` \| `motor_right` |
| `motors` | `differential_drive` |
| `curve` | `motor` |
| `moveLateral` / `moveXY` | `holonomic_drive` |

The same check runs twice with the same Portuguese message: statically via
`checkProgramActions` (install time) and at runtime through
`RunOptions.capabilities` (`docs/MOTION.md` §7). Domain `requires` keeps AND
semantics, unchanged.
