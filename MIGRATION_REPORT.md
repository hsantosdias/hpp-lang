# MIGRATION_REPORT — H++ independent package

## Source

```text
C:\Users\Hugo\GitHub\SimuladorSoccerInfrared\packages\hpp-lang
```

(host `SimuladorSoccerInfrared` v1.12.9 — **untouched**, `git status` clean)

## Destination

```text
C:\Users\Hugo\GitHub\hpp-lang
```

(`hpp-lang@0.5.0` on NPM, MIT, `Lex → Parse → AST → Interpret → HppRuntime`)

## Files migrated (semantics preserved, byte-identical modulo ESM `.js` specifiers)

| Destination | Origin | Class | Change |
|---|---|---|---|
| `src/ast.ts` | `src/ast.ts` | CORE | none (only `.js` import suffixes) |
| `src/tokens.ts` | `src/tokens.ts` | CORE | none |
| `src/lexer.ts` | `src/lexer.ts` | CORE | none |
| `src/parser.ts` | `src/parser.ts` | CORE | none |
| `src/interpreter.ts` | `src/interpreter.ts` | CORE | `HppError`/`RuntimeError` moved to `errors.ts` (re-exported) |
| `src/version.ts` | `src/version.ts` | CORE | none (`0.5.0` kept) |
| `src/hardware.ts` | `src/hardware.ts` | ROBOTICS | none |
| `src/capabilities.ts` | `src/capabilities.ts` | ROBOTICS | none |
| `src/runtime.ts` | `src/runtime.ts` | ROBOTICS | none (pre-existing `runtime↔index` cycle kept, works in build + Node) |
| `src/index.ts` | `src/index.ts` | API | expanded public exports (`Lexer/Parser/Interpreter`, AST/token/error/lex/parse types, robotics facades); `Program`/`compile` untouched |
| `src/examples.ts` | `src/examples.ts` | EXAMPLE lib | none (all 12 programs intact) |
| `src/extensions/soccer/index.ts` | `src/extensions/soccer.ts` | EXTENSION | moved to directory layout (+`.js` depth fix) |
| `src/extensions/line/index.ts` | `src/extensions/line.ts` | EXTENSION | idem + 1 comment word (`Soccer` → `outro domínio`, for the soccer-free static guard) |
| `src/extensions/maze/index.ts` | `src/extensions/maze.ts` | EXTENSION | moved to directory layout |

## Files created (structural improvement, no behavior change)

- `src/errors.ts` — `HppError`/`RuntimeError` home (single definition).
- `src/robotics/{types,sensors,actions,snapshot}.ts` — layered facades;
  only new logic is `normalizeSnapshotKeys`, mirroring the interpreter loop,
  covered by `tests/public-api.test.ts`.
- `examples/**/*.hpp` (14 files) — 12 byte-identical to `EXAMPLES` (verified
  by script, `trimEnd`-equal), plus new minimal `06-line/seguidor.hpp` and
  `07-maze/explorador.hpp` (both compile + pass their domain gates).
- `tests/isolation.test.ts` (23), `tests/examples.test.ts` (18),
  `tests/public-api.test.ts` (4) — new.
- Configs: root + package `package.json`, `tsconfig.json`,
  `tsconfig.build.json` (NodeNext, declarations + source maps), `vitest.config.ts`,
  `.gitignore`, CI (`ci/release/npm-publish`), issue templates.
- Docs: `docs/` (8), `SPEC/` (5), `README` (+Versioning/Roadmap/Contributing),
  `CHANGELOG.md`, `LICENSE` (root + package copy for the tarball).

## Files excluded (simulator-only, stay in `SimuladorSoccerInfrared`)

`src/lang/ScriptController.ts` (adapter), `src/lang/blocks.ts` (Blockly),
`src/ui/SensorPanel.ts`, `src/robots/ArduinoRobot.ts`, `src/main.ts`,
`src/popout.ts`, all `tests/` outside `packages/hpp-lang`, Three.js/Vite/DOM.

## Dependencies removed / retained

- Removed: `three`, `blockly`, `vite`, DOM lib (host-only). New package
  runtime deps: **zero**. Dev: `typescript@^5.6.3`, `vitest@^2.1.8`,
  `@types/node` (dev-only).
- Retained versions match the simulator's toolchain (no blind copying).

## Conflicts found (code/docs/prompt) — resolved by preserving behavior

1. Prompt says 109 tests/17 files → actual: **46/3** in `packages/hpp-lang`,
   **219/26** repo-wide. Preserved 46/46, added 45 → **91 total**.
2. Prompt says new version `0.2.0`, core `0.2.0` → actual core **`0.5.0`**
   (package.json + `version.ts`), soccer **`0.3.0`**. Kept `0.5.0` (no silent
   downgrade); documented in `CHANGELOG.md`.
3. `runtime.ts ↔ index.ts` circular import (pre-existing) — kept; verified
   working under vitest, `tsc` NodeNext build, and plain-Node `dist` import.
4. `line.ts` comment mentioned `Soccer` — reworded one word so the
   soccer-free static guard is literal, not aspirational.

## Results

```text
Before (packages/hpp-lang): 46 tests, 3 files — green
After  (hpp-lang repo):      91 tests, 6 files — green (46 preserved + 45 new)
Build:     npm run build     — PASS (dist/ js + .d.ts + maps; plain-Node import verified,
                             incl. Line-only flow from compiled dist)
Typecheck: npm run typecheck — PASS
Test:      npm test          — 91/91 PASS
NPM:       npm pack --dry-run — hpp-lang-0.5.0.tgz, 79 files (dist+README+LICENSE)
Isolation: tests/isolation.test.ts — no simulator/UI/3D imports; line & maze
           soccer-free; core domain-free — PASS
Simulator: git status clean, fully functional (no changes made)
```

## Architecture validation

```text
Core independent from Simulator ............ PROVEN (isolation.test.ts + dist smoke test)
Robotics independent from Soccer ........... PROVEN (hardware/capabilities/runtime import nothing domain-specific)
Line independent from Soccer ............... PROVEN (static guard + MockLineHardware flow, core+line only)
Maze isolated (contracts only, no logic) ... PROVEN (descriptor test, zero soccer mentions)
```

## Remaining issues

- None blocking. `dist/` is git-ignored build output (rebuilt by CI/release).

## Next recommended step

Second stage (separate task, simulator repo): make `SimuladorSoccerInfrared`
consume `hpp-lang` from NPM (`npm i hpp-lang`), replacing the relative
`../../packages/hpp-lang/src/*` imports in `ScriptController.ts`/`blocks.ts`/
`main.ts`/`popout.ts`/`SensorPanel.ts`/`ArduinoRobot.ts` — UI behavior must
stay pixel-identical; keep the vendored copy until the NPM switch is green.
