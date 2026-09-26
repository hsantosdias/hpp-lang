# H++ Versioning

Normative spec: `SPEC/VERSIONING.md`.

## Rule

Core, extensions and host apps version **independently** (semver):

| Artifact | Current | Lives in |
|---|---|---|
| H++ core (lexer/parser/AST/interpreter/runtime) | `0.6.0` | `src/version.ts` → `HPP_CORE_VERSION` |
| npm package `hpp-lang` (release/packaging) | `0.6.1` | `packages/hpp-lang/package.json` |
| Robotics Motion layer | `0.1.0` | `src/robotics/motion.ts` → `HPP_ROBOTICS_VERSION` |
| soccer extension | `0.4.0` | `src/extensions/soccer/index.ts` |
| line extension | `0.2.0` | `src/extensions/line/index.ts` |
| maze extension | `0.2.0` | `src/extensions/maze/index.ts` |
| simulator (host, separate repo) | `1.13.0` | `SimuladorSoccerInfrared/package.json` |

Never use the simulator version as the H++ version.

## Policy

- Core `PATCH`: error-message wording, performance with identical semantics.
- Core `MINOR`: new syntax, actions, built-ins (bilingual aliases included).
- Core `MAJOR`: semantic or API break (gated by tests + `MIGRATION_REPORT`).
- Extensions bump alone when their vocabulary/contracts change.
- `HppRuntime.versions()` reports `{ core, extension, extensionId }` so hosts
  and classrooms can assert compatibility at runtime.
- Every release updates `CHANGELOG.md`.
