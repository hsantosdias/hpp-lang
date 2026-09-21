# SPEC — H++ Versioning (normative)

1. Core, extensions and hosts version independently (semver). Current:
   core `0.5.0`, soccer `0.3.0`, line `0.1.0`, maze `0.1.0`.
2. The simulator/host version is NEVER the H++ version.
3. `HppRuntime.versions()` exposes `{ core, extension, extensionId }`.
4. Releases update `CHANGELOG.md`; breaks update `MIGRATION_REPORT.md`.

Details: `docs/VERSIONING.md`.
