# H++ Examples

Executable `.hpp` programs, organized by domain. Every file must compile with
`compile()` from `hpp-lang` (verified by `tests/examples.test.ts`).

| Folder | Domain | Programs |
|---|---|---|
| `01-basics` | core | `danca` |
| `02-control` | core | `patrulha`, `predicados` |
| `03-robotics` | robotics | `cola`, `dupla` |
| `04-sensors` | sensors | `perseguidor`, `goleiro` |
| `05-soccer` | soccer | `linha`, `segura`, `atacante_v2`, `atacante_v3`, `atacante_v4` |
| `06-line` | line | `seguidor` |
| `07-maze` | maze | `explorador` |

The `danca`, `perseguidor`, `goleiro`, `patrulha`, `dupla`, `cola`, `linha`,
`segura`, `atacante_v2/v3/v4` and `predicados` programs are byte-identical to
the `EXAMPLES` library shipped in `packages/hpp-lang/src/examples.ts` (the same
library the simulator loads as default robot programs).
