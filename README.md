# H++

## Educational Programming Language for Autonomous Robotics

**H++** is a bilingual educational programming language designed to teach programming, robotics and autonomous systems through readable code, visual blocks and real robotic concepts.

H++ was originally created as the programming language of the **SimuladorSoccerInfrared**, but its architecture was designed from the beginning to evolve beyond soccer.

> **The simulator is the first laboratory. The language is the lasting product.**

## ✨ Features

* 🇧🇷 Portuguese syntax with 🇺🇸 English aliases
* 🧩 Text and visual-block programming
* 🤖 Robotics-oriented actions and sensors
* 🔄 Deterministic cycle-based execution
* 🧠 Persistent variables between control cycles
* 🛡️ Execution fuel to prevent infinite loops
* 💬 Educational error messages
* 🔌 Hardware abstraction
* 🧱 Capability-based runtime
* ⚽ Soccer extension
* ➖ Line-following extension
* 🧩 Maze robotics extension
* 🧪 Automated test suite
* 📦 npm package
* 🔧 TypeScript implementation

## Example

```hpp
SE ver_bola ENTAO
    MIRAR_BOLA
    ANDAR 0.7

    SE dist_bola < 0.2 ENTAO
        CHUTAR
    FIM
SENAO
    GIRAR 0.5
FIM
```

The same language can also be written using English aliases:

```hpp
IF see_ball THEN
    AIM_BALL
    DRIVE 0.7

    IF ball_dist < 0.2 THEN
        KICK
    END
ELSE
    TURN 0.5
END
```

## 🏗️ Architecture

```text
H++ Source
    │
    ▼
  Lexer
    │
    ▼
  Parser
    │
    ▼
   AST
    │
    ▼
Interpreter
    │
    ▼
HppRuntime
    │
    ├───────────────┐
    ▼               ▼
Robotics API     Capabilities
    │
    ├── Soccer
    ├── Line
    └── Maze
    │
    ▼
 Hardware Adapter
    │
    ▼
 Real or Simulated Robot
```

The language core has no dependency on a particular simulator, robot model or competition.

## 🧩 Domains

### Soccer

Originally developed for RoboCupJunior Soccer Infrared.

Supports concepts such as:

* ball detection
* ball direction
* distance
* compass
* line sensors
* kicker
* dribbler
* team radio
* attack/defense behaviors

### Line Following

Designed for future line-following robots.

The extension can provide:

* line sensors
* line error
* motor control
* intersection detection
* navigation primitives

### Maze

Designed for autonomous maze robots.

The extension defines contracts for:

* distance sensors
* wall detection
* grid cells
* maze maps
* navigation

## 📦 Installation

```bash
npm install hpp-lang
```

## 🚀 Philosophy

H++ is designed around a simple progression:

```text
READ
  ↓
UNDERSTAND
  ↓
PROGRAM
  ↓
SIMULATE
  ↓
TEST
  ↓
CONTROL
  ↓
BUILD
  ↓
USE ON REAL ROBOT
```

The objective is not to hide robotics complexity forever.

The objective is to **introduce complexity progressively**.

## 🔬 Robotics Model

H++ programs operate on a control-cycle model.

A program executes a small piece of logic on each cycle, while variables persist between cycles as the robot's memory.

This makes it possible to express:

* state machines
* counters
* feedback control
* sensor-based decisions
* communication
* autonomous behaviors

## 📚 Documentation

* `docs/LANGUAGE.md` — language reference
* `docs/ARCHITECTURE.md` — architecture
* `docs/RUNTIME.md` — runtime model
* `docs/HARDWARE.md` — hardware abstraction
* `docs/CAPABILITIES.md` — capabilities
* `docs/EXTENSIONS.md` — domains
* `docs/TESTING.md` — testing strategy
* `docs/VERSIONING.md` — version policy

## 🧪 Testing

```bash
npm test
```

The project maintains isolated tests for the language core, runtime, robotics contracts and domain extensions.

## 🌱 Origin

H++ was created as part of the **SimuladorSoccerInfrared**, a 3D experimental platform for RoboCupJunior Soccer Infrared.

The simulator currently uses H++ as its standard programming language for autonomous robots.

The language was subsequently structured as an independent multidomain architecture so that the same programming model could evolve toward line-following, maze robotics and physical robots.

> The simulator Soccer was the first application laboratory of H++, but the language was designed to exist beyond it.

## 🔢 Versioning

Core, extensions and host apps version independently:

| Artifact | Version |
|---|---|
| H++ core | `0.5.0` |
| soccer extension | `0.3.0` |
| line extension | `0.1.0` |
| maze extension | `0.1.0` |

See `docs/VERSIONING.md` and `CHANGELOG.md`.

## 🗺️ Roadmap

- Harden the maze domain with a first host (simulated or physical).
- Line-follower bench programs validated against `MockLineHardware`.
- Host adapters for RP2040 / ESP32 physical robots.
- Simulator consumes `hpp-lang` from NPM instead of a vendored copy.
- New domains (`sumo`, `rescue`, …) as pure extensions — core untouched.

## 🤝 Contributing

1. Preserve behavior first (`PRESERVE` before `IMPROVE`).
2. Core changes require bilingual aliases, PT errors and tests.
3. New domains ship as extensions with mock hardware, examples and gate tests.
4. Keep `npm run typecheck`, `npm run build` and `npm test` green.

## 📜 License

MIT

## 👨‍💻 Author

**Hugo Santos Dias**

Educational robotics · Embedded Systems · Autonomous Robotics
