# H++ Versioning

Normative spec: `SPEC/VERSIONING.md`.

## Rule

Core, extensions and host apps version **independently** (semver):

| Artifact | Current | Lives in |
|---|---|---|
| H++ core (lexer/parser/AST/interpreter/runtime) | `0.5.0` | `src/version.ts` → `HPP_CORE_VERSION`, npm `hpp-lang@0.5.0` |
| soccer extension | `0.3.0` | `src/extensions/soccer/index.ts` |
| line extension | `0.1.0` | `src/extensions/line/index.ts` |
| maze extension | `0.1.0` | `src/extensions/maze/index.ts` |
| simulator (host, separate repo) | `1.12.9` | `SimuladorSoccerInfrared/package.json` |

Never use the simulator version as the H++ version.

## Policy

- Core `PATCH`: error-message wording, performance with identical semantics.
- Core `MINOR`: new syntax, actions, built-ins (bilingual aliases included).
- Core `MAJOR`: semantic or API break (gated by tests + `MIGRATION_REPORT`).
- Extensions bump alone when their vocabulary/contracts change.
- `HppRuntime.versions()` reports `{ core, extension, extensionId }` so hosts
  and classrooms can assert compatibility at runtime.
- Every release updates `CHANGELOG.md`.
