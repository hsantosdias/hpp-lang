# H++ Testing

```bash
npm install
npm test            # vitest run — full suite, must be green
npm run test:watch  # watch mode
npm run typecheck   # tsc --noEmit
npm run build       # emits packages/hpp-lang/dist (js + .d.ts + maps)
```

## Suite layout (`tests/`)

| File | Covers | Origin |
|---|---|---|
| `lang.test.ts` | lexer + parser + `EXAMPLES` compile | preserved from simulator |
| `interp.test.ts` | interpreter semantics on fake hardware | preserved from simulator |
| `architecture.test.ts` | versions, capabilities, runtime, line-mock without soccer, maze contracts, reset/cycle/snapshot policies | preserved from simulator |
| `isolation.test.ts` | **two guards**: glob-based §3/§26 isolation (no domain/3D/`setTimeout`/wall-clock in core) + fs-based literal scan; line & maze soccer-free; core domain-free | merged with simulator |
| `examples.test.ts` | every `examples/**/*.hpp` compiles; soccer/line/maze programs pass their domain gates; `EXAMPLES` ↔ `.hpp` byte parity | new + extended |
| `public-api.test.ts` | `Lexer/Parser/Interpreter/HppRuntime` round-trip from the public entrypoint; snapshot normalization; motion exports | new + extended |
| `motion.test.ts` | basic/temporal/spatial/motor/state primitives, suspension clock, capability gate | from simulator |
| `line.test.ts` | line domain on `MockLineHardware`: robotics primitives, temporal clock, encoder requirement | from simulator |
| `maze.test.ts` | maze contracts + compass-driven `GIRAR_GRAUS`, wall gate, no fake arrival | from simulator |
| `soccer.test.ts` | domain actions vs motion primitives, soccer odometry, progressive §29 programs | from simulator |

Baseline preserved: **46/46** original tests green, plus **128** new ones
(174 total). Coverage is never silently reduced: new behavior ships with tests.

## Conventions

- Fake hardware (`sensors()` + action log) for semantics; `MockLineHardware`
  for the line domain; `HppRuntime` for cycle/capability behavior.
- Examples are executable specs: `tests/examples.test.ts` fails if any
  `.hpp` stops compiling or violates its domain gate.
