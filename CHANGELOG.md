# Changelog

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
