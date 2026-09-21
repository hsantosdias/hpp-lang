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
| `soccer` | 0.3.0 | production (first lab) | motor, encoder, compass, distance_sensor, ball_sensor, radio, kicker, dribbler, line_sensor | all 8 canonical |
| `line` | 0.1.0 | minimal + `MockLineHardware` | motor, encoder, line_sensor | drive, turn, stop |
| `maze` | 0.1.0 | contracts only | motor, encoder, distance_sensor, compass | drive, turn, stop |

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
