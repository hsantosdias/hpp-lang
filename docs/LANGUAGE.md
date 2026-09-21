# H++ Language Reference

Normative spec: `SPEC/LANGUAGE.md`. This document describes the grammar as
implemented (parser + interpreter + tests), not an aspiration.

## Program model

A program body runs **once per control cycle**; student variables persist
between cycles (robot memory). Fuel defaults to **5000 nodes per cycle**:
an infinite `ENQUANTO VERDADEIRO` aborts the cycle with a hint in Portuguese
instead of hanging. All errors carry line + Portuguese message. Words are
case-insensitive; identifiers normalize to lowercase; `#` starts a comment.

## Statements

| Form | Meaning |
|---|---|
| `SE/QUANDO cond [ENTAO] … [SENAO …] FIM` | conditional (`QUANDO` = alias) |
| `SENAO SE …` on the SAME line | else-if chain, single closing `FIM` |
| `SE` on its own line after `SENAO` | classic nesting (own `FIM` each) |
| `ENQUANTO cond [FACA] … FIM` | while |
| `REPETIR n VEZES … FIM` | counted repetition |
| `PARA i DE a ATE b [PASSO p] … FIM` | for loop |
| `FUNCAO nome([args]) … FIM` | function definition |
| `RETORNAR [expr]` | return (bare, value, or boolean/`NÃO x`) |
| `SEMPRE … FIM` | readability wrapper (runs inline each cycle) |
| `nome = expr` | assignment (creates persistent global if new) |

## Expressions (precedence, low → high)

`OU` < `E` < `NÃO` < comparison (`== != < <= > >=`) < `+-` < `*/%` < `^`
(power, right-associative: `2^3^2 = 512`, `-2^2 = -4`) < unary < `()`.

Literals: numbers, `"text"`, `VERDADEIRO/TRUE`, `FALSO/FALSE`.
Built-ins: `ABS(x)`, `MIN(a,b)`, `MAX(a,b)`.
A bare `=` inside a condition is a parse error suggesting `==`.

## Actions (actuators)

| PT | EN | Canonical | Args |
|---|---|---|---|
| `ANDAR v` | `DRIVE` | `drive` | 1 (clamped −1..1) |
| `GIRAR d` | `TURN` | `turn` | 1 (clamped −1..1) |
| `CHUTAR` | `KICK` | `kick` | 0 → `Hardware.fire()` |
| `PARAR` | `STOP` | `stop` | 0 |
| `MIRAR_BOLA` | `AIM_BALL` | `aimBall` | 0 → `aimMain()` |
| `MIRAR_GOL` | `AIM_GOAL` | `aimGoal` | 0 → `aimSecondary()` |
| `ENVIAR_RADIO n` | `RADIO_SEND` | `radioSend` | 1 number |
| `DRIBLAR v` | `DRIBBLE` | `dribble` | 1 number (`0` = off) |

Type violations produce pedagogical errors naming the command in PT.

## Keywords PT/EN

`SE/IF`, `ENTAO/THEN`, `SENAO/ELSE`, `FIM/END`, `ENQUANTO/WHILE`, `FACA/DO`,
`REPETIR/REPEAT`, `VEZES/TIMES`, `PARA/FOR`, `DE/FROM`, `ATE/TO`,
`PASSO/STEP`, `FUNCAO/FUNCTION`, `RETORNAR/RETURN`, `E/AND`, `OU/OR`,
`NAO/NOT`, `VERDADEIRO/TRUE`, `FALSO/FALSE`, `QUANDO/WHEN`, `SEMPRE/ALWAYS`.

Accents fold to plain ASCII (`NÃO`=NAO, `É`=E, `bússola`→`bussola`).
A comma decimal outside parentheses (`0,5`) is a dedicated error
(use `0.5`; commas separate call arguments: `MIN(1, 2)`).

## Execution policies

- **Reset**: new `Program` starts blank; `Program.reset()` clears student
  memory; `HppRuntime.reset()` clears only the `ciclo` counter.
- **Cycle**: `runProgram` increments `ciclo` even on error.
- **Reserved sensors**: the snapshot overwrites same-named variables every
  cycle (assignment to a sensor name lasts one cycle).
- **Functions**: see sensors, parameters and globals — never the caller's
  locals (no closures); cannot be stored in variables (call them directly).
- **Action vs reading**: `MIRAR_*` are control actions delegated to the
  adapter; `direcao_*` are perceptual readings of the current snapshot.
  Never use `direcao_bola` to decide goal alignment (ball ≠ goal).
