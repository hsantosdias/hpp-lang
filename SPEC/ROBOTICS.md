# SPEC — H++ Robotics (normative)

1. The `Hardware` contract (`sensors/drive/turn/fire/stop/aimMain/
   aimSecondary/radioSend/dribble`) is the sole bridge between programs and
   robots. Any project implements it and reuses the core unmodified.
2. Sensors arrive as a fresh per-cycle snapshot with lowercase keys; the
   runtime stamps `ciclo`/`cycle`. Snapshot overwrites same-named variables.
3. `runProgram` advances `ciclo` even on error; `Program.reset()` clears
   student memory; `HppRuntime.reset()` clears only the cycle counter.
4. Capability declarations (`Capability[]` + `requires`/`sensorRequires`)
   decide program/hardware compatibility via `checkProgramActions`, with
   Portuguese diagnostics. Hosts MUST gate at install time.

Details: `docs/HARDWARE.md`, `docs/CAPABILITIES.md`, `docs/RUNTIME.md`.
