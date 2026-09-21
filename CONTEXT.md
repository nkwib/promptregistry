# PromptRegistry

An OSS TypeScript SDK + CLI that turns a static prompt manifest into typed, greppable named imports with lockfile-gated integrity. The runtime engine (`src/runtime.ts`) is built on [@nkwib/tprompt](https://github.com/nkwib/tprompt) for placeholder extraction and rendering; promptregistry keeps its own `CompiledTemplate<Vars>` type on top so codegen can keep emitting a named `XxxVars` type per prompt.

## Language

**Manifest:**
A single JSON file hosted at a static URL that declares one or more prompt entries. Each entry carries a name, version tag, template string, and delimiter. The Manifest is the source of truth for every codegen, check, and init operation.
_Avoid:_ registry (overloaded with npm), config (too broad)

**Pin:**
A `name@version` string that uniquely identifies one prompt entry inside a Manifest. The Pin is what appears in generated code as the export name and in the lockfile as the reference key.
_Avoid:_ ref, identifier, key (too generic)

**Lockfile:**
`prompt-lock.json`. A committed JSON file that pins each Pin to its manifest URL, content hash, and version tag at the moment of codegen. The lockfile is the integrity gate: any drift between the recorded hash and the current remote hash surfaces as a build error.
_Avoid:_ snapshot, state file, cache

**Registry (generated):**
The `registry.ts` barrel file emitted by codegen. Re-exports each prompt as a named import so consumers write `import { customerSummary } from './prompts/.generated/registry'` instead of string-keyed `pull()` calls.
_Avoid:_ index.ts (collides with package entry), barrel.ts (implementation detail leaking into vocabulary)

**CodeGen:**
The CLI step that reads the local Manifest snapshot and writes: (1) one `.d.ts` per prompt entry with the manifest hash in its header, and (2) the `registry.ts` barrel. CodeGen is manual in v1; there is no watcher.
_Avoid:_ generate, build, compile (suggest a heavier build pipeline than what exists)

## Relationships

- A **Manifest** contains many prompt entries, each addressed by a **Pin**.
- **CodeGen** consumes the Manifest and emits `.d.ts` files plus the **Registry** barrel.
- The **Lockfile** records the content hash of the Manifest at CodeGen time.
- `promptregistry check` compares the **Lockfile** hash against the current remote Manifest hash. A mismatch means the Manifest was edited without a version bump.
- `promptregistry check --tsc` intercepts `tsc --noEmit` diagnostics and rewrites those originating from generated `.d.ts` files into human-readable messages naming the offending **Pin**, the changed **Placeholder**, and the call-site line.
- The **Registry** barrel re-exports each prompt as a named import typed by the **Compiled template** shape (`src/runtime.ts`). The consumer never calls `pull()` directly; the barrel is the public surface.

## Template compiler vocabulary (src/runtime.ts)

PromptRegistry's runtime engine is `@nkwib/tprompt`: `src/runtime.ts` calls tprompt's `makePromptTag` to extract placeholders and render templates, then wraps the result in promptregistry's own `CompiledTemplate<Vars>` type. The wrapper exists because tprompt's own `Compiled` type infers an anonymous object type from the template literal, while `check --tsc` needs the named `XxxVars` type codegen emits to appear verbatim in tsc's diagnostics.

- **Placeholder**: the named slot inside a delimiter, e.g. `userName` in `{{userName}}`
- **Variables object**: the object passed to `.with({...})` or `.partial({...})`
- **Compiled template**: the value returned by compiling a template string
- **Parser**: the pair (delimiter, placeholder regex) that extracts placeholders at runtime
- **Delimiter**: the pair `(open, close)` that wraps a placeholder

## Example dialogue

> **Dev:** "How do I use a prompt from the manifest?"
> **Library author:** "Run `promptregistry codegen` after editing the manifest. Import from the generated barrel: `import { customerSummary } from './prompts/.generated/registry'`. The named export is typed by the placeholders in the manifest entry, so a missing variable is a `tsc` error before it reaches the model."

> **Dev:** "What happens if someone edits the remote manifest without bumping the version?"
> **Library author:** "The lockfile catches it. `promptregistry check` compares the recorded hash against the live remote. If they differ, it exits non-zero and `promptregistry check --tsc` rewrites the diagnostic into a human message naming the prompt and the call site."

## Flagged ambiguities (resolved)

- "registry" was used both for the npm package name and the generated barrel file — resolved: the package is **PromptRegistry**, the generated file is the **Registry** barrel.
- "lock" was used both for the lockfile and the `promptregistry lock` command — resolved: the file is the **Lockfile**, the command is `promptregistry lock`.
- "pull" was debated as a public API vs internal utility — resolved: `pull()` is an **internal** utility consumed by generated code; the public surface is named imports from the **Registry** barrel.
