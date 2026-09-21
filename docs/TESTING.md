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
| `isolation.test.ts` | **static guard**: no simulator/UI/3D imports; line & maze soccer-free; core domain-free | new |
| `examples.test.ts` | every `examples/**/*.hpp` compiles; soccer/line/maze programs pass their domain gates | new |
| `public-api.test.ts` | `Lexer/Parser/Interpreter/HppRuntime` round-trip from the public entrypoint; snapshot normalization | new |

Baseline preserved: **46/46** original tests green, plus **45** new ones
(91 total). Coverage is never silently reduced: new behavior ships with tests.

## Conventions

- Fake hardware (`sensors()` + action log) for semantics; `MockLineHardware`
  for the line domain; `HppRuntime` for cycle/capability behavior.
- Examples are executable specs: `tests/examples.test.ts` fails if any
  `.hpp` stops compiling or violates its domain gate.
