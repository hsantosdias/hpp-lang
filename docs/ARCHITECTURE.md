# H++ Architecture

Normative spec: `SPEC/ARCHITECTURE.md`. Language reference: `docs/LANGUAGE.md`.

## Pipeline

```text
H++ Source
    ↓
Lexer (`src/lexer.ts`, `src/tokens.ts`)
    ↓
Parser (`src/parser.ts`)
    ↓
AST (`src/ast.ts`)
    ↓
Interpreter (`src/interpreter.ts`)
    ↓
HppRuntime (`src/runtime.ts`)
    ↓
Robotics (`src/robotics/`, `src/hardware.ts`, `src/capabilities.ts`)
    ↓
Capabilities gate (`checkProgramActions`)
    ↓
Extension (`src/extensions/soccer|line|maze`)
    ↓
Hardware Adapter (implemented by the HOST project, not here)
    ↓
Robot (simulated or physical)
```

## Layer rule

```text
Core ≠ Robotics ≠ Domain ≠ Simulator
```

- **Core** (`ast`, `tokens`, `lexer`, `parser`, `interpreter`, `errors`,
  `version`): pure language. No imports from robotics, domains, simulator,
  Three.js, React, DOM or browser globals. Sensors are opaque lowercase
  strings arriving from outside; the core never validates domain names.
- **Robotics** (`hardware`, `capabilities`, `runtime`, `robotics/`): generic
  robotics concepts — `Hardware` contract, `SensorSnapshot`, canonical
  actions, capability model, `HppRuntime` (cycle clock + capability gate +
  version info). Still domain-free: no soccer, no line, no maze.
- **Domain extensions** (`extensions/soccer`, `extensions/line`,
  `extensions/maze`): an `ExtensionDescriptor`
  `{ id, version, domain, capabilities, sensors, actions, requires?,
  sensorRequires?, verbs? }` plus optional domain contracts
  (`LineSensor`, `MazeMap`, …). Extensions never touch the parser; domain
  verbs map to canonical actions via `verbs` + `LexOptions.extraActions`.
- **Simulator / hardware**: NOT in this repository. The host (e.g.
  `SimuladorSoccerInfrared`, an ESP32 firmware, a line-follower bench)
  implements `Hardware` and feeds sensor snapshots. The reference adapter
  pattern is `SoccerHardware` + `ScriptController` in the simulator repo.

## Key decisions (preserved from the simulator)

- No `IMPORT`/`USAR` module system in the language: `runtime` +
  `capabilities` + `extensions` + host adapters are the extension mechanism.
- Cycle-based execution (host owns the frequency; the core owns the `fuel`
  limit of 5000 nodes per cycle and persistent variables).
- Bilingual PT/EN aliases resolved at lex time to canonical forms.
- Independent versioning: core ≠ extension ≠ host app (`docs/VERSIONING.md`).
