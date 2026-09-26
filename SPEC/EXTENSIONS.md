# SPEC — H++ Extensions (normative)

1. Domains are `ExtensionDescriptor`s; the parser is never modified for a
   domain. Domain verbs map to canonical actions via `verbs`.
2. Shipped: `soccer@0.4.0` (production), `line@0.2.0` (minimal + mock),
   `maze@0.2.0` (contracts only, no logic — deliberate). The 21 Robotics
   motion primitives are available in every domain without being listed in
   `actions`.
3. New domains (sumo, rescue, drone, …) add a descriptor + contracts + mock
   + examples + gate tests, without touching the core.
4. Soccer specifics MUST NOT leak into the core or into sibling extensions
   (line and maze are statically asserted soccer-free).

Details: `docs/EXTENSIONS.md`.
