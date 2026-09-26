# hpp-lang (package)

H++, a bilingual educational programming language for autonomous robotics.

```ts
import { Lexer, Parser, Interpreter, HppRuntime, compile } from 'hpp-lang';
```

## Layout

- `src/` — core (`ast`, `tokens`, `lexer`, `parser`, `interpreter`, `errors`,
  `version`), robotics (`hardware`, `capabilities`, `runtime`,
  `robotics/` — incl. the Motion layer: `contracts`, `motion`, `index`),
  domain extensions (`extensions/soccer|line|maze`) and the `EXAMPLES`
  program library (`examples.ts`).
- Executable `.hpp` counterparts of the library live in `/examples`
  (repo root), organized by domain.

## Versions

Core `0.6.0` · Robotics Motion `0.1.0` · soccer `0.4.0` · line `0.2.0` ·
maze `0.2.0` — versioned independently (see `src/version.ts` and each
`extensions/*/index.ts`).

## Build (NPM)

```bash
npm run build   # emits dist/ with .js + .d.ts + source maps
```
