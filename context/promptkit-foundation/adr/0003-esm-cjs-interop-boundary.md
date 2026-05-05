---
status: accepted
---

# ESM/CJS interop boundary: ESM-source dual-publish with `sideEffects: false`

## The boundary

Source is ESM (`"type": "module"` in `package.json`, `import` syntax in `.ts` files, explicit `.js` extensions on relative imports under `--module nodenext`). The build emits both an ESM and a CJS artifact per public entry, wired together with conditional exports so module-system interop is invisible to consumers — the same `import` (or `require`) of `'promptkit'` resolves to the right bytes per environment.

`package.json#exports` shape:

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs",
    "types": "./dist/index.d.ts"
  },
  "./single-brace": {
    "import": "./dist/single-brace.js",
    "require": "./dist/single-brace.cjs",
    "types": "./dist/single-brace.d.ts"
  }
},
"engines": { "node": ">=20" },
"sideEffects": false
```

`engines.node` is `>= 20`. Node 18 reached end-of-life in April 2025; setting a floor at an EOL release in 2026 would read as "this library doesn't track the ecosystem." Node 20 is the current LTS floor, 22 is active. The library uses no Node-specific API, so the floor is a positioning signal more than a runtime requirement — and the right signal is "current era," not "I copied this from a 2023 boilerplate."

`sideEffects: false` unlocks aggressive tree-shaking in consumer bundlers (Vite, esbuild, webpack 5+, Rollup). This is load-bearing for the 2KB pitch: the worst-case consumer experience for a "tiny utility library" is importing one thing and being unable to shake the rest.

There is no `promptkit/compat` subpath. Module-system interop is handled by conditional exports, not by carving out a CJS-flavour entry point — see [ADR-0002](./0002-pluggable-parser-architecture.md) for why subpath exports are reserved for behaviour variants only.

## The invariants the boundary depends on

The boundary above is only safe — and the `sideEffects: false` claim only true — while the source code holds these invariants:

1. **No module-level singletons or shared mutable state.** Supports both the dual-package hazard analysis and the `sideEffects: false` claim. A module-level cache (e.g. memoised compiled templates keyed by `strings.raw` identity) would forfeit both: tree-shaking would have to assume the side-effect of cache initialisation, and an ESM+CJS dual-load would fork cache state.
2. **No `instanceof` checks against library-defined classes.** Supports dual-package hazard non-existence. A `prompt`...`` invocation today returns a plain object literal closed over `strings.raw`; it has no class. Introducing a `CompiledTemplate` class with an `instanceof` check anywhere in the API would mean an ESM-loaded template tested against a CJS-imported `CompiledTemplate` would silently return `false`.
3. **No Symbol-keyed registries.** Supports dual-package hazard non-existence. A `Symbol('promptkit.template')` allocated at module top-level would have a different identity in the ESM vs. CJS copy of the module. Plain string keys do not have this hazard.
4. **No top-level await in source.** Supports both `sideEffects: false` and CJS-publish. TLA forces dynamic-import-only consumption from CJS (`require` of a TLA module throws), which would silently break the conditional-exports promise. It also marks the module as having a side-effect from the bundler's perspective.
5. **No module-init work.** Supports `sideEffects: false`. File I/O, network calls, parser-cache warming, registering a global Zod resolver, or any work that runs at import time — all break the claim. The factory `makePromptTag` is the right home for any deferred initialisation; module top-level must remain pure declarations.

If a future feature requires invalidating any of these — say, a perf-driven module-level template cache, or an `instanceof` check to guard public APIs — this ADR must be revisited and the boundary restructured. The boundary is not load-bearing because of the `package.json` shape; it is load-bearing because of the invariants above.

## Considered options

- **`engines.node >= 18`.** Rejected — EOL since April 2025; signals "didn't update the boilerplate."
- **`engines.node >= 14`** (the actual floor for conditional exports). Rejected — technically permissive but actively misleading; nobody is testing on Node 14 in 2026.
- **`sideEffects: true` (default).** Rejected — silently disables tree-shaking in most consumer bundlers, breaking the 2KB promise on import.
- **ESM-only, no CJS publish.** Rejected during the ADR-0002 grill — leaves mixed-pipeline consumers (older Next.js configs, Jest without transform) with broken installs and no library-side fix. Conditional exports remove the consumer-visible seam.
- **CJS source with build to ESM.** Rejected — against 2026 ecosystem direction; forces source-level workarounds for dynamic `import()` and breaks parity with how every fresh TS library is shipping.
- **`promptkit/compat` as a CJS-flavour subpath.** Rejected in ADR-0002 — confuses the subpath namespace and incentivises consumers to stay on broken tooling rather than upgrade.

## Consequences

- Adding any of {module-level cache, `instanceof` check, Symbol registry, TLA, module-init work} is a structural change, not a feature change. It must come with a revision of this ADR and a deliberate decision to drop one of {`sideEffects: false`, dual-package safety, CJS publish}.
- The `.js`-extension-on-relative-imports requirement under `--module nodenext` is a contributor-experience papercut, not an architectural cost. A one-line note in `CONTRIBUTING.md` covers it; not worth recording here beyond this mention.
- Consumers on Node 18 or below who want to use the library can do so (the runtime supports conditional exports from Node 14+) but receive no support guarantee and no test coverage. The `engines` field is a soft warning, not a hard gate.
- The `package.json#exports` map gains exactly one block per behaviour-variant subpath (per ADR-0002), each with the same `import` / `require` / `types` triple. New delimiter variants follow the pattern; module-system flavours never appear here.
