# Changelog

## 0.6.0 — 2026-09-26

Second sync with the simulator (`SimuladorSoccerInfrared` v1.13.0, commits
`a21abae` + `b0c9837` — source `packages/hpp-lang`, untouched).

- **Robotics Motion Primitives** (`src/robotics/{contracts,motion,index}.ts`,
  `HPP_ROBOTICS_VERSION 0.1.0`): 21 universal movement verbs shared by every
  domain — basic (`VOLTAR`, `VIRAR_*`), temporal (`ANDAR_POR`, `ESPERAR`, …),
  spatial (`ANDAR_METROS`, `GIRAR_GRAUS`, …), motors (`MOTORES`, `MOTOR_*`),
  advanced (`CURVA`, `MOVER_LATERAL`, `MOVER_XY`)
- **Non-blocking time**: `Program.run(hw, fuel, opts)` and
  `HppRuntime.runProgram(program, fuel, opts)` take `RunOptions`
  (`capabilities` + deterministic `dt`, default `1/120`); temporal commands
  *suspend* the program (generator) instead of freezing the runtime — no
  `sleep`/`setTimeout`/`await` anywhere in the core
- **Never fake arrival**: spatial commands need a real `encoder`/`odometry` or
  `bussola`/`compass` reading, otherwise they abort with a PT error (line
  included) instead of pretending the goal was reached
- **Motion state sensors** injected each cycle: `esta_andando`, `esta_parado`,
  `esta_girando`, `movimento_ativo`, `movimento_concluido` (+ EN aliases)
- **Capability gate extended**: `MOTION_REQUIREMENTS` (OR semantics —
  `encoder` **ou** `odometry`, `differential_drive`, `holonomic_drive`, …)
  enforced at runtime with the same PT message as compile time;
  `roboticsProfile()` derives the movement profile from capabilities
- **Hardware contract**: optional `motor/motorLeft/motorRight/motors/
  moveLateral/moveXY` methods; missing methods produce a PT "not implemented"
  error instead of a `TypeError`
- Vocabulary: `ActionName` grows to 26 canonical actions (+`ACTION_PT` display
  names); extensions bumped — soccer `0.4.0`, line `0.2.0` (+`sensorRequires`
  for `encoder`/`odometria`), maze `0.2.0`
- Examples: 6 new programs (`examples/08-motion/`) — 18 library examples total,
  byte-identical to `examples/*.hpp` (enforced by `tests/examples.test.ts`)
- Tests: 4 new suites (`motion`, `line`, `maze`, `soccer`) + richer isolation
  guards — **174 tests green**; typecheck and `dist/` build green

## 0.5.0 — 2026-09-21


Initial independent H++ package extracted from the Robot Soccer Simulator
(`SimuladorSoccerInfrared`, host v1.12.9 — untouched, still functional).

- Independent H++ core: lexer, parser, AST, interpreter, errors, version
  (byte-identical semantics; fuel 5000/cycle; PT errors; PT/EN aliases)
- Robotics runtime: `Hardware` contract, `SensorSnapshot`, canonical actions,
  capability model (`requires`/`sensorRequires` gates), `HppRuntime`
  (deterministic `ciclo`, version reporting)
- Capability model with Portuguese diagnostics
- Domain extensions: soccer@0.3.0 (production vocabulary), line@0.1.0
  (minimal + `MockLineHardware`), maze@0.1.0 (contracts only)
- Public API: `Lexer, Parser, Interpreter, HppRuntime, compile, Program`
  (+ AST/hardware/capability/extension types), NodeNext-compatible ESM
  build (`dist/` with JS + declarations + source maps)
- 14 executable examples (`.hpp`) organized by domain, byte-identical to
  the `EXAMPLES` library where applicable
- Test suite: 46/46 original tests preserved + 45 new (isolation guards,
  example compilation + domain gates, public API) — 91 total, green
- Docs (`docs/`), normative specs (`SPEC/`), CI (install/typecheck/build/
  test), NPM publish workflow

Notes: package version `0.5.0` preserves the real core version from the
simulator (not reset to `0.2.0`); test baseline is 46 hpp-lang tests
(219 total in the simulator repo), not 109 — see `MIGRATION_REPORT.md`.
