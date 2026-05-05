# PromptRegistry — Kickoff

## What this project is

OSS TypeScript SDK + CLI. A static prompt manifest (a JSON file in a GitHub repo or public bucket) becomes a typed `pull('prompt-name@v3')` callable. Ships with a `prompt-lock.json` lockfile (analogous to `package-lock.json`) and a `promptregistry check` step that intercepts `tsc --noEmit` and rewrites diagnostics into human-readable build errors at the call site. The launch pitch is a screenshot of the rewritten error, not the API.

**Target ship: 5 weeks. Solo. OSS. No hosted backend, no Stripe, no paid tier in v1.**

## Critical dependency: promptkit

PromptRegistry sits on top of a separate library called **promptkit** — a tagged-template `prompt` primitive, NOT part of this project. The promptkit context is in `context/promptkit-foundation/` (its `CONTEXT.md` glossary and three settled ADRs). Treat that vocabulary (`Placeholder`, `Variables object`, `Compiled template`, `Parser`) as canonical and **extend it, never contradict it**.

PromptRegistry can be implemented before promptkit ships, but the runtime SDK has a hard dependency on `promptkit`'s `prompt` API. Wire the npm dependency now and stub locally if needed.

## Where to look first

```
context/
  final.md                         # find the PromptRegistry section (p3, NOT promptkit p1)
  proposals.json                   # full p3 scope
  topic.md
  round-1/, round-2/               # p3 persona feedback only
  promptkit-foundation/
    CONTEXT.md                     # canonical glossary — DO NOT redefine these terms
    adr/                           # promptkit's settled decisions, may inform lockfile
issues/
  001 … 016                        # 16 starter issues, week-1 → week-5
  999-v2-deferred.md               # web editor UI, hosted backend, A/B testing, audit logs
```

## First action — run grill-with-docs FIRST

Before opening any issue:

```
> /grill-with-docs
```

Reason: PromptRegistry introduces a new vocabulary on top of promptkit (`Manifest`, `Lockfile`, `Pull`, `Pin`) and three load-bearing decisions are flagged in the issue set as `awaits_adr` and unresolved:

- **ADR-0004** — `pull` named-import vs barrel re-export semantics. Gates issues 003 and 005.
- **ADR-0005** — `prompt-lock.json` semantics: gitignored vs committed; fail-on-pull vs fail-on-check; what counts as drift. Gates issues 006 and 007.
- **ADR-0006** — `promptregistry check` placement: pre-commit vs CI vs both. Gates issue 007.

`grill-with-docs` will Socratically walk the design tree, sharpen terminology against the existing promptkit glossary, and write `CONTEXT.md` + the three ADRs inline. **Do this before week-1 starts.** A wandering grill is cheaper than a wrong lockfile semantic baked into 17 issues.

After the grill session lands, revisit each `awaits_adr`-tagged issue and inline the resolved decision before working on it.

## Issue dependency chain at a glance

```
week-1: 001 (manifest fetcher), 002 (manifest schema), 009 (CLI skeleton)
week-2: 003 (pull), 004 (.d.ts codegen), 005 (registry barrel)
week-3: 006 (prompt-lock.json), 007 (promptregistry check), 008 (init)
week-4: 010 (tsc rewrite), 011 (e2e fixture)
week-5: 012 (README hero), 013 (API ref), 014 (screenshots), 015 (npm publish), 016 (launch)
```

## Guardrails (non-negotiable)

- **Solo-shippable in ≤ 5 weeks.** If a ticket grows, cut scope inside it.
- **No `/compat` subpaths or other tooling-workaround sidecars.** The user's ADR style refuses them.
- **No hosted UI, no Stripe billing, no Supabase backend, no AWS Lambda API in v1.** All deferred in `999-v2-deferred.md`.
- **No migration importers from Langfuse/PromptLayer.**
- **Tests live inside each build issue.** Not separate tickets.
- **The launch pitch is the rewritten `tsc` diagnostic.** Issue 010's wording and issue 014's screenshot pipeline are byte-coupled — keep them in lockstep.

## What success looks like

- `npm install promptregistry` works.
- A PM edits the manifest JSON, removes a variable, and the engineer's `tsc --noEmit` returns a human message naming the offending prompt, the removed variable, the call-site line, and the version-pin escape hatch.
- `prompt-lock.json` catches "remote prompt edited without version bump" silently-shipping bugs.
- README hero is the screenshot of that error.
