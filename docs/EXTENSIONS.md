# H++ Extensions

Normative spec: `SPEC/EXTENSIONS.md`.

Domains plug in through `ExtensionDescriptor` — **no parser changes**:

```ts
interface ExtensionDescriptor {
  id: string;                 // 'soccer' | 'line' | 'maze' | …
  version: string;            // independent from core and host
  domain: string;             // human-readable
  capabilities: Capability[];
  sensors: string[];          // lowercase sensor vocabulary (PT + EN)
  actions: string[];          // canonical actions supported
  requires?: Partial<Record<ActionName, Capability[]>>;
  verbs?: Record<string, ActionSpec>;   // domain verbs → canonical actions
  sensorRequires?: Record<string, Capability[]>;
}
```

## Shipped extensions

| Extension | Version | Status | Capabilities | Actions |
|---|---|---|---|---|
| `soccer` | 0.4.0 | production (first lab) | motor, differential_drive, encoder, compass, distance_sensor, ball_sensor, radio, kicker, dribbler, line_sensor | 5 domain + the 21 motion primitives |
| `line` | 0.2.0 | minimal + `MockLineHardware` | motor, encoder, line_sensor | drive, turn, stop (+ motion) |
| `maze` | 0.2.0 | contracts only | motor, encoder, distance_sensor, wall_detector, compass | drive, turn, stop (+ motion) |

The 21 Robotics motion primitives (`docs/MOTION.md`) are available in **every**
domain without being listed in `actions`; the domain list only gates *domain*
verbs and the per-action `requires` check.

`line` additionally exports `lineError()` (lateral error −1..1, PID base),
`LineSensor`/`LineController` contracts and `MockLineHardware` (classroom
tests without soccer). `maze` exports `DistanceSensor`, `WallDetector`,
`GridCell`, `MazeMap`, `Navigator` — **no navigation logic on purpose**:
a future maze host implements them and declares `MAZE_EXTENSION`.

## Adding a domain (e.g. `sumo/`, `rescue/`, `drone/`)

1. Create `src/extensions/<id>/index.ts` with a descriptor + contracts.
2. Export it from `src/index.ts`.
3. Provide a mock hardware + example under `examples/NN-<id>/`.
4. Add gate tests (`checkProgramActions`) proving foreign actions are
   rejected and native ones pass.
5. Never modify the parser: domain verbs go in `verbs`
   (e.g. line `SEGUIR → drive`), consumed via `compile(src, { extraActions:
   EXTENSION.verbs })` — core verbs take precedence.
