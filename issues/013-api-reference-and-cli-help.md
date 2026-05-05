---
id: 013
title: API reference — pull, Manifest, Pin, prompt-lock.json, CLI subcommands
milestone: week-5
estimate: 1d
depends_on: [003, 006, 007, 008]
blocks: [015]
awaits_adr: []
type: docs
---

## Why

The README hero sells the wedge; the reference docs let a converted reader actually use it. Without one canonical place that names every PromptRegistry term (`Manifest`, `Pin`, `prompt-lock.json`) and lists each CLI subcommand's flags, users diverge on terminology in their own docs and in issue reports.

## Scope

- A `docs/api.md` (or equivalent) that documents:
  - `pull(pin)` — signature, return type, throws.
  - `Manifest` shape — link to issue 002's schema.
  - `Pin` — `name@version` grammar, version semantics.
  - `prompt-lock.json` — file shape, lifecycle, what counts as drift.
  - Each CLI subcommand: flags, exit codes, examples.
- Every promptkit-foundation term that PromptRegistry uses (Placeholder, Variables object, Compiled template, Parser) is linked to promptkit's `CONTEXT.md`, not redefined.

## Acceptance criteria

- Every public symbol exported from the package appears in the docs.
- Every CLI subcommand's `--help` output is consistent with the docs (manual diff is enough; no automated drift gate in v1).
- No term defined in promptkit's CONTEXT.md is redefined here.

## Out of scope

- Tutorials beyond the quickstart fixture.
- API.md auto-generation from JSDoc (overkill for v1).

## Notes

If during writing a term needs disambiguation that promptkit's CONTEXT.md does not cover, that's a signal for the grill-with-docs session — not a fix in this issue.
