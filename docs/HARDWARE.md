# H++ Hardware Contract

`src/hardware.ts` — the only thing the core sees of the physical world:

```ts
interface Hardware {
  sensors(): Record<string, SensorValue>; // fresh snapshot every cycle
  drive(throttle: number): void;          // -1..1 (clamped by interpreter)
  turn(steer: number): void;              // -1..1 (clamped by interpreter)
  fire(): void;                           // main actuator (kick/gripper/light)
  stop(): void;
  aimMain(): void;                        // aim at the primary target
  aimSecondary(): void;                   // aim at the secondary target
  radioSend(msg: number): void;
  dribble(on: boolean): void;
}
```

`SensorValue = number | boolean | string`.

## Rules for adapter authors

1. Return a **new snapshot object every cycle**; keys lowercase (the
   interpreter lowercases defensively anyway — see `normalizeSnapshotKeys`).
2. Never expose absolute world position. Perception must be relative
   (documented exception: maze `celula_x`/`cell_z`, discrete grid cells).
3. Not every robot has every actuator — declare what exists via
   `ExtensionDescriptor` + `Capability[]` (`docs/CAPABILITIES.md`); leave
   unsupported canonical actions unimplemented on the type level by choosing
   a domain whose `actions` list excludes them.
4. Keep per-cycle allocation low on the hot path (the reference
   implementation avoids spreads/`Object.entries` in snapshot handling).
5. Time: expose wall/game clocks as snapshot sensors if the domain needs
   them; the core only provides the `ciclo` counter.

Reference adapter (lives in the simulator repo, not here):
`SoccerHardware` + `ScriptController` — reads IR/compass/sonar/line/game and
writes throttle/steer/kick/dribbler/radio.
