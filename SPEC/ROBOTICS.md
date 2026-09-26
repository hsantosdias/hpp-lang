# SPEC — H++ Robotics (normative)

1. The `Hardware` contract (`sensors/drive/turn/fire/stop/aimMain/
   aimSecondary/radioSend/dribble` plus the optional `motor/motorLeft/
   motorRight/motors/moveLateral/moveXY`) is the sole bridge between programs
   and robots. Any project implements it and reuses the core unmodified; a
   missing optional method yields a Portuguese error, never a `TypeError`.
2. Sensors arrive as a fresh per-cycle snapshot with lowercase keys; the
   runtime stamps `ciclo`/`cycle`. Snapshot overwrites same-named variables.
3. `runProgram` advances `ciclo` even on error; `Program.reset()` clears
   student memory; `HppRuntime.reset()` clears only the cycle counter.
4. Capability declarations (`Capability[]` + `requires`/`sensorRequires`)
   decide program/hardware compatibility via `checkProgramActions`, with
   Portuguese diagnostics. Hosts MUST gate at install time.
5. The Robotics Motion layer (`src/robotics/`) owns the 21 universal
   primitives, the deterministic clock (`RunOptions.dt`, default `1/120`) and
   suspension semantics: a pending temporal/spatial command returns
   `suspended: true` and the next cycle resumes it — the runtime is never
   blocked. The core MUST NOT contain `sleep`, `setTimeout`, `await` or
   wall-clock reads.
6. Spatial commands MUST abort with a Portuguese error (line included) when
   the required reading (`encoder`/`odometry`/`bussola`/`compass`) is absent —
   arrival is never faked. `MOTION_REQUIREMENTS` uses OR semantics and reports
   the same message as the static gate.

Details: `docs/HARDWARE.md`, `docs/CAPABILITIES.md`, `docs/RUNTIME.md`,
`docs/MOTION.md`.
