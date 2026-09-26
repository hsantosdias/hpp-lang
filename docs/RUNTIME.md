# H++ Runtime

## Two ways to run

- `Program.run(hw, fuel = 5000, opts?: RunOptions)` — one cycle, raw
  `Hardware`. Variables persist inside the `Program` across calls (compat
  path).
- `HppRuntime.runProgram(program, fuel = 5000, opts?)` — **recommended
  path**: wraps any `Hardware`, injects `ciclo`/`cycle` into the snapshot,
  counts cycles deterministically, exposes capabilities and versions.

`RunOptions` (`§7/§28`):

- `capabilities?: Capability[] | null` — enables the runtime capability gate
  with the same Portuguese message as `checkProgramActions`. Default: the
  runtime's own list; `null` runs the core "pure" (no gate).
- `dt?: number` — seconds per cycle of the deterministic clock (default
  `1/120`). Temporal commands (`ANDAR_POR`, `ESPERAR`, …) accumulate `dt`;
  never `Date.now()`, `sleep`, `setTimeout` or `await`.

**Suspension**: while a temporal/spatial command is pending the program is
*suspended* — `run()`/`runProgram()` return `{ ok, steps, suspended: true }`
and the host simply calls again next cycle. The runtime is never blocked.

```text
H++ Program → Lexer → Parser → AST → Interpreter → HppRuntime → Adapter → Robot
```

## `HppRuntime`

- `ciclo`: ticks since `reset()` — the core's deterministic clock. Hosts map
  wall/game time through snapshot sensors (e.g. soccer `tempo`), never
  through the core.
- `dt`: seconds per cycle of the deterministic clock (default `1/120`);
  hosts change it when their cycle frequency differs.
- `sensors()`: delegates to the wrapped hardware, stamping `ciclo`/`cycle`.
- Actuators delegate 1:1 (`drive/turn/fire/stop/aimMain/aimSecondary/
  radioSend/dribble`) plus the optional motion methods (`motor/motorLeft/
  motorRight/motors/moveLateral/moveXY`) — a missing method surfaces as a
  Portuguese "not implemented" error.
- `versions()`: `{ core, extension, extensionId }` — independent versioning.
- `getCapabilities()` / `exigir(...need)`: capability introspection with a
  Portuguese explanation when something is missing.
- `runProgram()` advances `ciclo` even when the cycle errors, and reports
  `suspended` while a temporal/spatial movement is pending.
- `reset()` clears only the cycle counter (student memory lives in `Program`).

## Host responsibilities

The host owns: cycle frequency (e.g. simulator 120 Hz), snapshot content,
actuator physics, `setSource`-style gates (`checkProgramActions`), and error
surfacing. The core owns: grammar, fuel, persistence semantics, PT errors.
