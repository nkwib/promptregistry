# PromptRegistry Quickstart

This fixture demonstrates the full PromptRegistry flow against the local
package (the `dependencies` entry in `package.json` points at `file:../..`).

## Setup

```bash
cd examples/quickstart
npm install
```

This installs `tsx`, `typescript`, and the `promptregistry` CLI from the
parent workspace.

## Step 1 — Generate types from the manifest

```bash
npm run codegen
```

This writes:
- `prompts/.generated/customer-summary.ts`
- `prompts/.generated/welcome-message.ts`
- `prompts/.generated/registry.ts`
- `prompts/.generated/prompt-lock.json`

## Step 2 — Import the generated barrel

`src/main.ts` already does this:

```ts
import { customerSummary } from '../prompts/.generated/registry.js'

const output = customerSummary.with({
  customerName: 'Ada',
  planTier: 'Pro',
  joinDate: '2024-01-15',
})

console.log(output)
```

The `.js` extension is intentional — under NodeNext module resolution the
import specifier must include the runtime extension even though the source
file is `.ts`. Run it:

```bash
npm start
```

## Step 3 — Edit the manifest without bumping the version

Open `manifest.json` and remove the `joinDate` placeholder from the
`customer-summary` template. **Do not** bump the version: keep it at `v1`.

```diff
-      "template": "Summarize the account for {{customerName}} on the {{planTier}} plan. They joined on {{joinDate}}.",
+      "template": "Summarize the account for {{customerName}} on the {{planTier}} plan.",
```

This simulates a remote prompt author silently editing a published version
— the exact failure mode PromptRegistry is built to catch.

## Step 4 — Run the check

```bash
npm run check
```

`promptregistry check` recomputes the manifest's content hash, compares it
to the hash recorded in `prompts/.generated/prompt-lock.json`, and exits
non-zero with a `hash-drift` error:

```
Error [hash-drift]: Hash drift for customer-summary@v1: lockfile hash <old> != remote hash <new>
```

The lockfile is your tripwire: any silent edit to a pinned version of a
prompt is caught before runtime.
