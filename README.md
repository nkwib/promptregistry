# PromptRegistry

An OSS TypeScript SDK + CLI that turns a static prompt manifest into typed, greppable named imports with lockfile-gated integrity.

**The pitch:** a PM edits the remote prompt manifest and removes a variable. Your engineer's `tsc --noEmit` returns a human message naming the offending prompt, the removed variable, and the version-pin escape hatch.

```
Remote prompt 'customer-onboarding@v3' removed variable 'customer_name' —
update your call site or pin to a previous version.
```

## What it does

1. **Static manifest** — a JSON file hosted on GitHub raw, a release asset, or a public bucket. Each entry has a name, version, template string, and delimiter.
2. **`promptregistry codegen`** — fetches the manifest, emits one runtime `.ts` per prompt (typed via a named `XxxVars` alias), and writes a `registry.ts` barrel with named exports.
3. **Lockfile integrity** — `prompt-lock.json` pins each prompt to its content hash. `promptregistry check` fails if the remote was edited without a version bump.
4. **Human tsc errors** — because each prompt's variables are exported as a named type, tsc's native error already calls out the prompt: `... not assignable to parameter of type 'CustomerSummaryVars'`. `promptregistry check --tsc` adds an extra pass that rewrites diagnostics from the generated files themselves.

## Quick start

```bash
npm install promptregistry
```

Create a `manifest.json`:

```json
{
  "manifest-format-version": "1",
  "prompts": [
    {
      "name": "customer-summary",
      "version": "v1",
      "template": "Summarize the account for {{customerName}} on the {{planTier}} plan.",
      "delimiter": { "open": "{{", "close": "}}" }
    }
  ]
}
```

Generate types:

```bash
npx promptregistry codegen --manifest ./manifest.json --out ./prompts/.generated
```

Import and use (NodeNext requires the `.js` extension on the source-side import):

```ts
import { customerSummary } from './prompts/.generated/registry.js'

// Missing a variable? tsc catches it before it reaches the model.
const output = customerSummary.with({
  customerName: 'Ada',
  planTier: 'Pro',
})
```

Wire into your build script:

```json
{
  "scripts": {
    "typecheck": "promptregistry check && tsc --noEmit"
  }
}
```

## Relationship to promptkit

PromptRegistry is built on the [promptkit](https://tprompt.pages.dev/) tagged-template primitive. PromptRegistry does not redefine promptkit's terms:

- **Placeholder** — the named slot inside a delimiter, e.g. `customerName` in `{{customerName}}`
- **Variables object** — the object passed to `.with({...})`
- **Compiled template** — the value returned by the `prompt` tag
- **Parser** — the pair (delimiter, placeholder regex) that extracts placeholders

See [promptkit's CONTEXT.md](./context/promptkit-foundation/CONTEXT.md) for canonical definitions.

## CLI commands

| Command | Purpose |
|---------|---------|
| `promptregistry codegen` | Generate runtime `.ts` files and `registry.ts` from the manifest |
| `promptregistry check` | Cross-check manifest, lockfile, and generated files |
| `promptregistry check --tsc` | Run `tsc --noEmit` and rewrite diagnostics |
| `promptregistry lock` | Write `prompt-lock.json` from the current manifest |
| `promptregistry init` | Scaffold manifest from existing `prompt()` call-sites |

## Configuration

Create `promptregistry.config.json`:

```json
{
  "manifestUrl": "https://example.com/manifest.json",
  "srcRoots": ["./src"],
  "outDir": "./prompts/.generated"
}
```

Or pass flags: `--manifest <url>`, `--src <dirs>`, `--out <dir>`.

## Non-goals

- No hosted web UI in v1
- No eval running — use promptfoo for that
- No migration importers from Langfuse or PromptLayer
- No template logic (`{{#if}}`, loops) — variables only

## License

MIT
