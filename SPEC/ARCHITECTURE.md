# SPEC — H++ Architecture (normative)

1. Layers: Core (language only) → Robotics (generic contracts) → Domain
   extensions (descriptors) → Host adapters (outside this repo).
2. The core MUST compile and test standalone: no simulator, Three.js,
   React, DOM, UI, or domain imports. Enforced by `tests/isolation.test.ts`.
3. `HppRuntime` is the recommended execution path: deterministic `ciclo`
   clock, capability gate, version reporting.
4. Hosts own frequency, snapshots, physics and error surfacing. The core
   owns grammar, fuel, persistence and PT errors.
5. Structural improvements must preserve behavior (migration rule:
   PRESERVE before IMPROVE).

Details: `docs/ARCHITECTURE.md`, `docs/RUNTIME.md`, `docs/HARDWARE.md`.
