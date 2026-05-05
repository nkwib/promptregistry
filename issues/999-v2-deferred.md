---
id: 999
title: v2 deferred — hosted UI, backend, A/B testing, audit logs, importers
milestone: deferred
estimate: 0d
depends_on: []
blocks: []
awaits_adr: []
type: docs
---

## Why

The v1 scope is OSS-only, statically hosted manifest, lockfile-gated integrity. Every feature explicitly punted in the round-table (hosted web editor UI, Stripe billing, Supabase backend, AWS Lambda API, A/B testing, role-based access, audit logs, migration importers from Langfuse/PromptLayer) lands here as a single tracked index, not as separate v1 tickets.

## Scope

This file is the canonical landing pad for "we considered it, we punted, here's why." Any incoming feature request matching one of the items below is closed with a link to this issue.

## Acceptance criteria

- All deferred items below are listed with one-line rationale.
- The README links here from a "What this is not" section.

## Out of scope

- Implementation of any deferred item.
- Roadmap / dates — explicitly no commitment.

## Notes

### Deferred items (with one-line rationale)

- **Web editor UI for non-engineers** — empirical question (Addy): unclear whether PMs actually edit raw JSON manifests in practice. v2 contingent on adoption data from real users.
- **Hosted backend / paid tier** — natural follow-on if the UI question above resolves toward "PMs need a UI." Punted until OSS adoption proves teams wire codegen + lockfile gates into CI.
- **Stripe billing / Supabase / AWS Lambda** — none of these have a place in a v1 OSS SDK. They surface only behind a hosted backend that itself is contingent.
- **A/B testing of prompts** — orthogonal concern; promptfoo and similar tools own this.
- **Role-based access / audit logs** — only meaningful if there is a hosted layer with multi-user auth.
- **Migration importers from Langfuse / PromptLayer** — defer until adoption signal indicates these specific tools are the dominant migration paths.
