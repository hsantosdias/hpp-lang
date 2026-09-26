# H++ Language Reference

Normative spec: `SPEC/LANGUAGE.md`. This document describes the grammar as
implemented (parser + interpreter + tests), not an aspiration.

## Program model

A program body runs **once per control cycle**; student variables persist
between cycles (robot memory). Fuel defaults to **5000 nodes per cycle**:
an infinite `ENQUANTO VERDADEIRO` aborts the cycle with a hint in Portuguese
instead of hanging. All errors carry line + Portuguese message. Words are
case-insensitive; identifiers normalize to lowercase; `#` starts a comment.

## Statements

| Form | Meaning |
|---|---|
| `SE/QUANDO cond [ENTAO] … [SENAO …] FIM` | conditional (`QUANDO` = alias) |
| `SENAO SE …` on the SAME line | else-if chain, single closing `FIM` |
| `SE` on its own line after `SENAO` | classic nesting (own `FIM` each) |
| `ENQUANTO cond [FACA] … FIM` | while |
| `REPETIR n VEZES … FIM` | counted repetition |
| `PARA i DE a ATE b [PASSO p] … FIM` | for loop |
| `FUNCAO nome([args]) … FIM` | function definition |
| `RETORNAR [expr]` | return (bare, value, or boolean/`NÃO x`) |
| `SEMPRE … FIM` | readability wrapper (runs inline each cycle) |
| `nome = expr` | assignment (creates persistent global if new) |

## Expressions (precedence, low → high)

`OU` < `E` < `NÃO` < comparison (`== != < <= > >=`) < `+-` < `*/%` < `^`
(power, right-associative: `2^3^2 = 512`, `-2^2 = -4`) < unary < `()`.

Literals: numbers, `"text"`, `VERDADEIRO/TRUE`, `FALSO/FALSE`.
Built-ins: `ABS(x)`, `MIN(a,b)`, `MAX(a,b)`.
A bare `=` inside a condition is a parse error suggesting `==`.

## Actions (actuators)

26 canonical actions — 21 Robotics primitives (basic / temporal / spatial /
motors+advanced, shared by every domain) plus 5 domain actions. Full norm in
`docs/MOTION.md`.

**Robotics — basic** (no capability required, available in every domain):

| PT | EN | Canonical | Args |
|---|---|---|---|
| `ANDAR v` | `DRIVE` | `drive` | 1 (clamped −1..1) |
| `VOLTAR v` | `REVERSE` | `reverse` | 1 (same physics as `drive(-v)`) |
| `PARAR` | `STOP` | `stop` | 0 → `Hardware.stop()` |
| `GIRAR d` | `TURN` | `turn` | 1 (clamped −1..1, positive = left) |
| `VIRAR_/GIRAR_ESQUERDA v` | `TURN_LEFT` | `turnLeft` | 1 (`turn(+v)`) |
| `VIRAR_/GIRAR_DIREITA v` | `TURN_RIGHT` | `turnRight` | 1 (`turn(-v)`) |

**Robotics — temporal** (non-blocking: the *program* suspends for `t` seconds
of the deterministic clock `dt`, default `1/120`; completion emits `stop()`):

| PT | EN | Canonical | Args |
|---|---|---|---|
| `ANDAR_POR v, t` | `DRIVE_FOR` | `driveFor` | speed, seconds |
| `VOLTAR_POR v, t` | `REVERSE_FOR` | `reverseFor` | speed, seconds |
| `GIRAR_POR v, t` | `TURN_FOR` | `turnFor` | steer, seconds |
| `PARAR_POR t` | `STOP_FOR` | `stopFor` | seconds |
| `ESPERAR t` | `WAIT` | `wait` | seconds (never touches motors) |

**Robotics — spatial** (needs a real sensor reading; never fakes arrival):

| PT | EN | Canonical | Args / reading |
|---|---|---|---|
| `ANDAR_METROS d` | `DRIVE_METERS` | `driveMeters` | meters ≥ 0; `encoder` **ou** `odometry` |
| `VOLTAR_METROS d` | `REVERSE_METERS` | `reverseMeters` | idem |
| `GIRAR_GRAUS a` | `TURN_DEGREES` | `turnDegrees` | degrees (negative = right); `bussola`/`compass`/`encoder`/`imu` |

**Robotics — motors & advanced** (capability-gated):

| PT | EN | Canonical | Capability |
|---|---|---|---|
| `MOTOR id, v` | `MOTOR` | `motor` | `motor_individual` |
| `MOTOR_ESQUERDO v` | `LEFT_MOTOR` | `motorLeft` | `motor_left` |
| `MOTOR_DIREITO v` | `RIGHT_MOTOR` | `motorRight` | `motor_right` |
| `MOTORES e, d` | `MOTORS` | `motors` | `differential_drive` |
| `CURVA v, dir` | `CURVE` | `curve` | `motor` (throttle + steer at once) |
| `MOVER_LATERAL v` | `MOVE_LATERAL` | `moveLateral` | `holonomic_drive` |
| `MOVER_XY vx, vy` | `MOVE_XY` | `moveXY` | `holonomic_drive` |

**Domain (soccer extension)**:

| PT | EN | Canonical | Args |
|---|---|---|---|
| `CHUTAR` | `KICK` | `kick` | 0 → `Hardware.fire()` |
| `MIRAR_BOLA` | `AIM_BALL` | `aimBall` | 0 → `aimMain()` |
| `MIRAR_GOL` | `AIM_GOAL` | `aimGoal` | 0 → `aimSecondary()` |
| `ENVIAR_RADIO n` | `RADIO_SEND` | `radioSend` | 1 number |
| `DRIBLAR v` | `DRIBBLE` | `dribble` | 1 number (`0` = off) |

## Motion state sensors

Injected by the interpreter every cycle (command readings, never physics):

| PT | EN | Meaning |
|---|---|---|
| `esta_andando` | `is_moving` | commanded drive ≠ 0 (`VOLTAR` counts) |
| `esta_parado` | `is_stopped` | no drive **and** no turn |
| `esta_girando` | `is_turning` | commanded turn ≠ 0 (or unequal wheels) |
| `movimento_ativo` | `motion_active` | pending temporal/spatial command **or** not stopped |
| `movimento_concluido` | `motion_done` | pulse: true only in the cycle a movement finished |

Type violations and capability violations produce pedagogical errors naming
the command in PT, with line numbers.

## Keywords PT/EN

`SE/IF`, `ENTAO/THEN`, `SENAO/ELSE`, `FIM/END`, `ENQUANTO/WHILE`, `FACA/DO`,
`REPETIR/REPEAT`, `VEZES/TIMES`, `PARA/FOR`, `DE/FROM`, `ATE/TO`,
`PASSO/STEP`, `FUNCAO/FUNCTION`, `RETORNAR/RETURN`, `E/AND`, `OU/OR`,
`NAO/NOT`, `VERDADEIRO/TRUE`, `FALSO/FALSE`, `QUANDO/WHEN`, `SEMPRE/ALWAYS`.

Accents fold to plain ASCII (`NÃO`=NAO, `É`=E, `bússola`→`bussola`).
A comma decimal outside parentheses (`0,5`) is a dedicated error
(use `0.5`; commas separate call arguments: `MIN(1, 2)`).

## Execution policies

- **Reset**: new `Program` starts blank; `Program.reset()` clears student
  memory; `HppRuntime.reset()` clears only the `ciclo` counter.
- **Cycle**: `runProgram` increments `ciclo` even on error.
- **Reserved sensors**: the snapshot overwrites same-named variables every
  cycle (assignment to a sensor name lasts one cycle).
- **Functions**: see sensors, parameters and globals — never the caller's
  locals (no closures); cannot be stored in variables (call them directly).
- **Action vs reading**: `MIRAR_*` are control actions delegated to the
  adapter; `direcao_*` are perceptual readings of the current snapshot.
  Never use `direcao_bola` to decide goal alignment (ball ≠ goal).
