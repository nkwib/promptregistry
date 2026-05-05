# PromptRegistry Quickstart

This fixture demonstrates the full PromptRegistry flow.

## Setup

```bash
cd examples/quickstart
npm install promptregistry
```

## Step 1: Generate types from the manifest

```bash
npx promptregistry codegen --manifest ./manifest.json --out ./prompts/.generated
```

This writes:
- `prompts/.generated/customer-summary.d.ts`
- `prompts/.generated/welcome-message.d.ts`
- `prompts/.generated/registry.ts`
- `prompts/.generated/prompt-lock.json`

## Step 2: Import the generated barrel

```ts
import { customerSummary } from '../prompts/.generated/registry'

const output = customerSummary.with({
  customerName: 'Ada',
  planTier: 'Pro',
  joinDate: '2024-01-15',
})
```

## Step 3: Edit the manifest without bumping the version

Remove `joinDate` from `manifest.json` but keep the version as `v1`.

## Step 4: Run the check

```bash
npx promptregistry check --manifest ./manifest.json --out ./prompts/.generated
```

This fails because the lockfile hash no longer matches the remote manifest hash.

## Step 5: Run with --tsc

```bash
npx promptregistry check --tsc --manifest ./manifest.json --out ./prompts/.generated
```

This runs `tsc --noEmit` and rewrites diagnostics from generated `.d.ts` files into human-readable messages naming the offending prompt and variable.
