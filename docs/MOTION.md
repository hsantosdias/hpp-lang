# MOTION — normative reference for the movement primitives

> **HPP Robotics Motion** layer (`hpp-lang@0.6.0`, `HPP_ROBOTICS_VERSION 0.1.0`).
> General norm: `SPEC/LANGUAGE.md`. This document is the norm for movement.

`packages/hpp-lang/src/robotics/{contracts,motion,index}.ts` sits between the
Core (language) and the extensions (domains). It is shared by **every** robot,
in any domain (§19/§33 of the H++ multi-domain plan).

```text
Source → Lexer → Parser → AST → Interpreter ─┐
                                        ↓     HppRuntime → Adapter → Robot
              Robotics Motion (primitives) ─┘   Soccer · Line · Maze
```

## 0. Golden rules

1. **Pure core**: no `sleep`, `setTimeout`, `await` or busy-wait. Time comes
   from the deterministic runtime clock (`RunOptions.dt`, default `1/120`).
2. **Suspension, not blocking**: a temporal command suspends the *program*
   (generator), never the runtime. The host keeps running while the robot moves.
3. **Never fake arrival**: without a real `encoder`/`compass` reading the
   spatial command fails with a pedagogical Portuguese error (line included).
4. **Pedagogical errors**: always `line + message in Portuguese`.
5. **Capability gated** (§21): if the robot lacks the capability, the error
   appears when applying/running the program, in Portuguese.

## 1. Basic movement

| PT | EN | Args | Semantics |
|---|---|---|---|
| `ANDAR v` | `DRIVE` | 1 | continuous drive `v` (−1..1, clamped) |
| `VOLTAR v` | `REVERSE` | 1 | reverse: same physics as `ANDAR` with negative `v` (`drive(-v)`) |
| `PARAR` | `STOP` | 0 | zeroes drive, turn and wheels |
| `GIRAR d` | `TURN` | 1 | continuous turn `d` (−1..1) |
| `VIRAR_ESQUERDA v` / `GIRAR_ESQUERDA v` | `TURN_LEFT` | 1 | `turn(+v)` — positive = left |
| `VIRAR_DIREITA v` / `GIRAR_DIREITA v` | `TURN_RIGHT` | 1 | `turn(-v)` — sign inverted |

Sign convention: **positive = left** (same as `GIRAR` and the compass).
`drive`/`reverse`/`stop`/`turn`/`turnLeft`/`turnRight` have **no entry in
`MOTION_REQUIREMENTS`**: they are the baseline of every robot and are never
blocked.

## 2. Temporal movement (§6/§7)

| PT | EN | Args |
|---|---|---|
| `ANDAR_POR v, t` | `DRIVE_FOR` | speed, seconds |
| `VOLTAR_POR v, t` | `REVERSE_FOR` | speed, seconds |
| `GIRAR_POR v, t` | `TURN_FOR` | steer, seconds |
| `PARAR_POR t` | `STOP_FOR` | seconds |
| `ESPERAR t` | `WAIT` | seconds |

- The program is **suspended** until `elapsed >= t` (sum of `dt` per cycle);
  then execution continues at the next instruction.
- **Completion emits `stop()`** for `ANDAR_POR`/`VOLTAR_POR`/`GIRAR_POR`
  (the robot does not keep driving "by itself"). `PARAR_POR` and `ESPERAR`
  do not emit `stop()` when done.
- `t <= 0` is a no-op (except `PARAR_POR`, which emits `stop()` at once).
- **Continuous ≠ temporal**: `ANDAR 0.5` keeps driving until another
  instruction changes it; `ANDAR_POR 0.5, 2` drives 2 s and stops by itself.

```text
ANDAR_POR 0.5, 1      # drive for 1 s, then stop
GIRAR_POR 0.5, 0.5    # turn for 0.5 s, then stop
ESPERAR 2             # wait 2 s without touching the motors
PARAR
```

## 3. Spatial movement (§8) — by distance

| PT | EN | Args | Reading used |
|---|---|---|---|
| `ANDAR_METROS d` | `DRIVE_METERS` | meters (≥ 0) | `encoder` / `odometria` / `odometry` |
| `VOLTAR_METROS d` | `REVERSE_METERS` | meters (≥ 0) | same |
| `GIRAR_GRAUS a` | `TURN_DEGREES` | degrees (negative = right) | `bussola` / `compass` |

- Emits `hw.drive(±1)` (or `hw.turn(±1)`) and waits for `|value| >= target`.
- `GIRAR_GRAUS` accumulates the normalized angle delta; accepts `> 180°`.
- **Without a real reading: Portuguese `RuntimeError`** — the command is
  aborted (`abortSpatial`), arrival is never faked.
- On completion it emits `stop()`.

```text
SE dist_frente < 0.30 ENTAO
  GIRAR_GRAUS 90
SENAO
  ANDAR_METROS 0.5
FIM
```

## 4. Motor control (§9/§11/§12)

| PT | EN | Args | Required capability |
|---|---|---|---|
| `MOTOR id, v` | `MOTOR` | wheel id, −1..1 | `motor_individual` |
| `MOTOR_ESQUERDO v` | `LEFT_MOTOR` | −1..1 | `motor_left` |
| `MOTOR_DIREITO v` | `RIGHT_MOTOR` | −1..1 | `motor_right` |
| `MOTORES e, d` | `MOTORS` | left, right | `differential_drive` |

- `MOTORES e, d` for differential robots: equal wheels drive straight; opposed
  wheels spin in place.
- The adapter decides what exists: if the underlying hardware does not
  implement the method, the runtime returns `undefined` and the interpreter
  raises `"<method> is not implemented on this hardware"` in Portuguese.
- `MOTORES` does NOT require `motor_individual` (it is the chassis
  abstraction, not the loose-wheel one).

## 5. Advanced movement (§13)

| PT | EN | Args | Capability |
|---|---|---|---|
| `CURVA v, dir` | `CURVE` | speed, direction (−1..1) | `motor` |
| `MOVER_LATERAL v` | `MOVE_LATERAL` | lateral displacement | `holonomic_drive` |
| `MOVER_XY vx, vy` | `MOVE_XY` | speed on X and Y | `holonomic_drive` |

`CURVA v, dir` sends **throttle + steer at the same time** (`drive(v)` +
`turn(dir)`) — the same physics as `ANDAR`/`GIRAR`, without duplicating or
inverting signals (§13).

## 6. Movement state (§14)

State sensors injected by the interpreter **every cycle** (they never invent
physics — they read the commanded state):

| PT sensor | EN sensor | Meaning |
|---|---|---|
| `esta_andando` | `is_moving` | drive command ≠ 0 (any sign; `VOLTAR` counts) |
| `esta_parado` | `is_stopped` | no drive **and** no turn |
| `esta_girando` | `is_turning` | turn command ≠ 0 (or unequal wheels) |
| `movimento_ativo` | `motion_active` | pending temporal/spatial **or** robot not stopped |
| `movimento_concluido` | `motion_done` | **pulse**: true only in the cycle a movement finished |

`velocidade`/`velocidade_angular` come from the adapter (when the hardware
publishes them) — the Core never computes them.

```text
ENQUANTO movimento_ativo FACA
  ESPERAR 0.05
FIM
# here the robot is really free for a new command
```

## 7. Capabilities and the gate (§20/§21)

`MOTION_REQUIREMENTS` uses **OR** semantics — one of the capabilities is
enough:

| Action | Accepted capabilities (OR) |
|---|---|
| `ANDAR_METROS` / `VOLTAR_METROS` | `encoder` **or** `odometry` |
| `GIRAR_GRAUS` | `encoder` **or** `odometry` **or** `compass` **or** `imu` |
| `MOTOR` | `motor_individual` |
| `MOTOR_ESQUERDO` / `MOTOR_DIREITO` | `motor_left` / `motor_right` |
| `MOTORES` | `differential_drive` |
| `CURVA` | `motor` |
| `MOVER_LATERAL` / `MOVER_XY` | `holonomic_drive` |

Domain actions (`CHUTAR`, `DRIBLAR`, …) stay in their own extension's
`requires` (AND semantics, unchanged).

Error message (§21):

```text
A ação ANDAR_METROS requer a capacidade encoder ou odometry.
Este robô não possui essa capacidade.
```

`Program.run(hw, fuel, opts)` / `HppRuntime.runProgram(program, fuel, opts)`:
`opts.capabilities` (default: the runtime's; `null` disables the gate) and
`opts.dt` (default `1/120`).

`roboticsProfile(caps)` derives a `RoboticsProfile`
(`motion`/`motors`/`encoders`/`locomotion`) from the declared capabilities —
hosts can use it to decide which blocks/verbs a robot exposes.

## 8. What is mandatory on every robot

`drive`, `reverse`, `stop`, `turn`, `turnLeft`, `turnRight` — no program needs
a capability to use them. Everything else is negotiated by capability.

## 9. Tests

`tests/motion.test.ts` (basic, temporal, spatial, motors, state, gate) ·
`tests/line.test.ts` · `tests/maze.test.ts` · `tests/soccer.test.ts` ·
`tests/isolation.test.ts` (line/maze without soccer, deterministic time) ·
`tests/public-api.test.ts` (motion exports from the package root).
