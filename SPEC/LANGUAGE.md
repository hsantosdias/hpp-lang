# SPEC — H++ Language (normative)

1. The unit of execution is one control cycle; student variables persist
   between cycles. Default fuel: 5000 nodes/cycle.
2. Every error carries a line number and a Portuguese message.
3. The language is bilingual PT/EN; aliases resolve at lex time to canonical
   forms. Accents fold to ASCII. Case-insensitive.
4. Grammar: `SE/QUANDO`, `ENQUANTO`, `REPETIR…VEZES`, `PARA…DE…ATE…[PASSO]`,
   `FUNCAO`, `RETORNAR`, `SEMPRE`, assignment, calls, operators with the
   precedence `OU < E < NÃO < comparação < +− < */% < ^ < unário < ()`.
5. Canonical actions (26): Robotics — `drive, reverse, stop, turn, turnLeft,
   turnRight, driveFor, reverseFor, turnFor, stopFor, wait, driveMeters,
   reverseMeters, turnDegrees, motor, motorLeft, motorRight, motors, curve,
   moveLateral, moveXY`; domain (soccer) — `kick, aimBall, aimGoal, radioSend,
   dribble`. Temporal actions suspend the program for `dt`-accumulated seconds
   (never block, never use wall-clock time); spatial actions MUST read a real
   sensor and MUST NOT fake arrival. No absolute-position sensing; perception
   is relative (documented maze grid-cell exception).
6. No module/import syntax in the language. Extension happens via runtime,
   capabilities, extension descriptors and host adapters.

Details: `docs/LANGUAGE.md`.
