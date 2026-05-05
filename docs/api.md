# PromptRegistry API reference

This document is the canonical reference for PromptRegistry's public surface: the **Manifest** schema, **Pin** grammar, the **Lockfile** (`prompt-lock.json`), each CLI subcommand, and the shape of generated modules.

PromptRegistry inherits its core vocabulary from promptkit. Terms in **bold-italic** below — _**Placeholder**_, _**Variables object**_, _**Compiled template**_, _**Parser**_ — are not re-defined here. See [`./context/promptkit-foundation/CONTEXT.md`](../context/promptkit-foundation/CONTEXT.md) for canonical definitions.

---

## Manifest

A **Manifest** is a single JSON file at a static URL (GitHub raw, release asset, public bucket, or local path) that declares every prompt entry the application uses. The Manifest is the source of truth for `codegen`, `check`, and `init`.

The schema is documented in detail in [issue 002](../issues/002-manifest-schema-and-validation.md).

Minimal example:

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

Each entry contains:

| Field | Type | Notes |
|-------|------|-------|
| `name` | `string` | Lowercase kebab-case. Becomes the camelCase export in the registry barrel. |
| `version` | `string` | Free-form version tag (e.g. `v1`, `v2.0.1`). Pinned in the Lockfile. |
| `template` | `string` | The template body containing _**Placeholders**_ wrapped in the entry's delimiter. |
| `delimiter` | `{ open, close }` | The _**Parser**_'s opening and closing markers. |

---

## Pin

A **Pin** is the `name@version` string that uniquely identifies one Manifest entry. Examples: `customer-summary@v1`, `welcome-message@v2.0.1`.

Grammar:

```
Pin     := Name "@" Version
Name    := lowercase kebab-case identifier
Version := free-form tag (no whitespace, no "@")
```

Pins appear in two places: as the reference key in `prompt-lock.json` entries, and in the header comment of each generated `.ts`.

---

## `prompt-lock.json`

The **Lockfile** is committed alongside the Manifest. It records, for every Pin, the manifest URL and the SHA-256 content hash of the Manifest at the moment of `codegen` (or `lock`).

Shape:

```json
{
  "lockfile-format-version": "1",
  "entries": [
    {
      "name": "customer-summary",
      "version": "v1",
      "manifest_url": "https://example.com/manifest.json",
      "content_hash": "<sha256-of-the-manifest-payload>",
      "pulled_at": "2026-05-05T08:28:27.718Z"
    }
  ]
}
```

`promptregistry check` defines four kinds of **drift** and fails on any of them:

| Drift | Meaning |
|-------|---------|
| **Hash drift** | The content hash recorded in the Lockfile does not match the current remote Manifest hash. Someone edited the remote without a version bump. |
| **Version drift** | The Manifest declares a version that differs from the Lockfile entry for the same `name`. Re-run `promptregistry lock` after intentionally bumping. |
| **Missing pin** | A Pin referenced by generated code or the registry barrel has no corresponding Lockfile entry. |
| **Orphaned pin** | A Lockfile entry has no matching Manifest entry — the prompt was removed remotely. |

---

## CLI commands

The CLI is a single binary, `promptregistry`. Run any subcommand with `--help` to see flags.

### `promptregistry codegen`

Generate runtime `.ts` files and `registry.ts` from the Manifest, and refresh `prompt-lock.json`.

```
$ promptregistry codegen [--manifest <url>] [--src <dirs>] [--out <dir>]
```

| Flag | Meaning |
|------|---------|
| `--manifest <url>` | Manifest URL or path. Falls back to `promptregistry.config.json#manifestUrl`. |
| `--src <dirs>` | Comma-separated source roots (used by static-analysis features). |
| `--out <dir>` | Output directory for generated files (default `./prompts/.generated`). |

Exit codes: `0` on success, `1` on Manifest validation failure or fetch failure.

Example:

```bash
npx promptregistry codegen --manifest ./manifest.json --out ./prompts/.generated
```

### `promptregistry check`

Cross-check the Manifest, Lockfile, and generated files. Fails on any drift (see [`prompt-lock.json`](#prompt-lockjson)).

```
$ promptregistry check [--tsc] [--manifest <url>] [--src <dirs>] [--out <dir>]
```

| Flag | Meaning |
|------|---------|
| `--tsc` | Also run `tsc --noEmit` and rewrite diagnostics that originate from generated files. |
| `--manifest <url>` | Manifest URL or path. |
| `--src <dirs>` | Comma-separated source roots. |
| `--out <dir>` | Generated-files directory. |

Exit codes: `0` clean, `1` drift detected, `2` `tsc` reported errors (with `--tsc`).

Example:

```bash
npx promptregistry check --manifest ./manifest.json --out ./prompts/.generated
```

### `promptregistry lock`

Write `prompt-lock.json` from the current Manifest, replacing any existing entries. Use this after a deliberate version bump.

```
$ promptregistry lock [--manifest <url>] [--out <dir>]
```

| Flag | Meaning |
|------|---------|
| `--manifest <url>` | Manifest URL or path. |
| `--out <dir>` | Directory in which to write `prompt-lock.json`. |

Exit codes: `0` on success, `1` on Manifest fetch / validation failure.

Example:

```bash
npx promptregistry lock --manifest ./manifest.json --out ./prompts/.generated
```

### `promptregistry init`

Scaffold a Manifest by scanning a source directory for existing `prompt()` call-sites.

```
$ promptregistry init [--src <dir>]
```

| Flag | Meaning |
|------|---------|
| `--src <dir>` | Source directory to scan (default `./src`). |

Exit codes: `0` on success, `1` if the source directory does not exist.

Example:

```bash
npx promptregistry init --src ./src
```

---

## Generated module shape

For a Manifest entry named `customer-summary`, `codegen` writes `<outDir>/customer-summary.ts`:

```ts
// Generated by promptregistry — do not edit by hand
// Pin: customer-summary@v1
// Hash: <sha256>

import { compile } from '@nkwib/promptregistry/runtime'

export type CustomerSummaryVars = {
  customerName: string
  planTier: string
}

const _template = compile<CustomerSummaryVars>(
  "Summarize the account for {{customerName}} on the {{planTier}} plan.",
  { open: "{{", close: "}}" },
)

export default _template
```

Each generated module exports:

| Symbol | Meaning |
|--------|--------|
| `XxxVars` (named type) | The _**Variables object**_ shape inferred from the entry's _**Placeholders**_. The named alias is what makes a missing-variable `tsc` error name the prompt. |
| `default` (the _**Compiled template**_) | A runtime value with `.with(vars)`, `.partial(vars)`, `.validate(schema)`, `.validateSafe(schema)`. |

The registry barrel `<outDir>/registry.ts` re-exports each prompt as a camelCase named import:

```ts
export { default as customerSummary } from './customer-summary.js'
export { default as welcomeMessage } from './welcome-message.js'
```

---

## Public package surface

The `promptregistry` package's public surface is intentionally minimal. End users do not import runtime values from `promptregistry` directly; they import the generated modules from `<outDir>/registry.js`.

### `import type { ... } from '@nkwib/promptregistry'`

Type-only exports. Re-exported from promptkit:

| Name | Meaning |
|------|--------|
| `CompiledTemplate<Vars>` | The shape of a _**Compiled template**_. |
| `PromptTag<Open, Close>` | The shape of a tagged-template factory parameterised by delimiter. |

### `@nkwib/promptregistry/runtime`

This subpath exports a `compile()` helper. It exists so that the generated `.ts` files have a stable runtime to import. **It is an implementation detail of codegen, not a public API.** Do not import from `promptregistry/runtime` in handwritten code; import from the registry barrel instead.

### CLI

The `promptregistry` binary is the public CLI surface. Its subcommands and flags are documented above.
