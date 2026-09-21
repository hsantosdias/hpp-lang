# H++ Capabilities

Common vocabulary describing what a robot/hardware offers, without tying the
core to any domain (`src/capabilities.ts`).

## Capabilities

`motor | encoder | distance_sensor | line_sensor | imu | compass |
ball_sensor | radio | kicker | dribbler`

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
