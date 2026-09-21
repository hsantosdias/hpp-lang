# H++ Runtime

## Two ways to run

- `Program.run(hw, fuel = 5000)` — one cycle, raw `Hardware`. Variables
  persist inside the `Program` across calls (compat path).
- `HppRuntime.runProgram(program, fuel = 5000)` — **recommended path**:
  wraps any `Hardware`, injects `ciclo`/`cycle` into the snapshot, counts
  cycles deterministically, exposes capabilities and versions.

```text
H++ Program → Lexer → Parser → AST → Interpreter → HppRuntime → Adapter → Robot
```

## `HppRuntime`

- `ciclo`: ticks since `reset()` — the core's deterministic clock. Hosts map
  wall/game time through snapshot sensors (e.g. soccer `tempo`), never
  through the core.
- `sensors()`: delegates to the wrapped hardware, stamping `ciclo`/`cycle`.
- Actuators delegate 1:1 (`drive/turn/fire/stop/aimMain/aimSecondary/
  radioSend/dribble`).
- `versions()`: `{ core, extension, extensionId }` — independent versioning.
- `getCapabilities()` / `exigir(...need)`: capability introspection with a
  Portuguese explanation when something is missing.
- `runProgram()` advances `ciclo` even when the cycle errors.
- `reset()` clears only the cycle counter (student memory lives in `Program`).

## Host responsibilities

The host owns: cycle frequency (e.g. simulator 120 Hz), snapshot content,
actuator physics, `setSource`-style gates (`checkProgramActions`), and error
surfacing. The core owns: grammar, fuel, persistence semantics, PT errors.
