---
status: accepted
---

# Barrel-only public API — no exported `pull()`

The public SDK surface is the generated `registry.ts` barrel, which re-exports each prompt as a named import. The `pull(pin: string)` function exists only as an internal utility consumed by generated code. It is not exported from the `promptregistry` package entry point.

## Why

Three forces converged in the round-table grill:

1. **Refactor safety.** Matt + Theo flagged that `pull('customer-summary@v3')` is string-keyed and greppable only by regex. Renaming a prompt requires a global string search, not a TypeScript rename-symbol.
2. **The type-safety pitch.** The whole product is "a PM removes a variable and `tsc` catches it." If the canonical API is a string-keyed runtime call, the consumer experience is indistinguishable from an untyped registry. Named imports make the type contract visible at the import statement.
3. **The launch story.** The README hero is a screenshot of a rewritten `tsc` error. That error must point at a call site the user recognises (`customerSummary.with({...})`), not at an internal `.d.ts` generated from a string key.

`pull()` still exists because the barrel needs something to call at runtime to resolve a Pin against the Manifest and construct a promptkit `Compiled template`. But that runtime call is hidden inside generated code.

## Considered options

- **Export `pull()` as a public function alongside the barrel.** Rejected — teams will use it, and the string-keyed path undermines the refactor-safety story.
- **Export `pull()` but document it as "advanced use only."** Rejected — "advanced" surfaces in Stack Overflow answers and hackathon code; the default path must be the only path.
- **No `pull()` at all — inline the resolution into each generated file.** Rejected — duplicates the Manifest-loading and template-construction logic across N files; a single internal utility keeps the codegen output small and the runtime surface minimal.

## Consequences

- The `promptregistry` package exports only types and the CLI binary. The SDK surface is entirely generated.
- Every example in the README uses named imports from the barrel.
- The internal `pull()` signature is not under semver lock from consumers, only from the codegen step.
- If a future version introduces dynamic prompt resolution (e.g. `pull()` from a database), that becomes a new exported function with a different name, not a promotion of the internal utility.
