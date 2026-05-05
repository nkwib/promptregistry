# Type-safe prompt template library — Round Table Final

**Date:** 2026-05-03
**Roster:** matt-pocock, addy-osmani, theo-browne, guillermo-rauch
**Tribe:** devtools
**Rounds run:** 2

---

## TL;DR

**Ship promptkit (p1).** Across two rounds the panel converged decisively: mean score climbed from 7.5 to 9.0 with every active concern from round 1 closed by a concrete pivot, all four feasibility flags green, three weeks to MVP, zero dependencies, OSS. The wedge is a 2KB tagged-template `prompt` function whose template literal types parse `{{var}}` into an inferred variables object — so a typo in `{{usrName}}` becomes a `tsc` error before it reaches the model. The launch artifact is a TS Playground link wired into the `package.json#homepage` field and the GitHub repo description, paired with a Vercel AI SDK before/after demo. Matt scored it 10/10 in round 2 noting "nothing in the r1 concerns survives." PromptDiff (p2) and PromptRegistry (p3) are credible follow-ons but both depend on p1's primitive — ship p1 first, regardless of what comes after.

## Ranked proposals

| Rank | Title | Mean score | Weeks-to-MVP | OSS / paid | Killer concern |
|------|-------|------------|--------------|------------|----------------|
| 1    | promptkit       | 9.0 | 3 | OSS | Vercel team could absorb typed prompt variables into the AI SDK and consume the wedge before adoption compounds (positioning risk, not blocker) |
| 2    | PromptRegistry  | 7.5 | 5 | OSS | Stale-codegen silent failure if `promptregistry check` is opt-in and CI isn't wired; mitigated by lockfile but not eliminated |
| 3    | PromptDiff      | 6.5 | 3 | OSS | Rauch's structural dissent: OSS-CLI-only is "a gist, not a product" without a hosted retention surface — unresolved across two rounds |

## Winning proposal — deep dive

### Problem

TypeScript engineers writing LLM prompts today have two options: untyped string interpolation (Vercel AI SDK, raw template literals) or a full DSL with codegen (BAML). There is no minimal primitive that uses TS's own template literal types to make prompt variables a first-class type. A typo in `{{usrName}}` or passing a number where a string belongs ships silently to production. The gap between "string" and "DSL" is exactly where a thin TS-native primitive lives — and it doesn't exist yet.

### MVP scope (cut to the bone)

- A single `prompt` tagged-template function that parses `{{var}}` placeholders into a TS template literal type and infers a required variables object type
- `.with({...})` method requiring exact keys with correct types
- `.partial({...})` for partial application across multi-turn calls — with an explicit "partials do not compose" rule in docs to prevent combinator creep
- `.validate()` runs Zod coercion at the call site; `throw`-on-invalid is the default; `.validateSafe()` opt-in returns a `Result` for compile-time + runtime parity
- Pluggable delimiter from day one (avoids Handlebars/Mustache collision)
- Hard public scope line in README first paragraph: variables only, no template logic — no `{{#if}}`, no loops
- Runtime-string regression path documented prominently (dynamic templates from DB/i18n fall back to `string`)
- `npx promptkit init` scaffolds a `prompts/` directory with one typed example and prints the TS Playground URL — sub-60-second zero-to-first-error path
- `promptkit/compat` CJS re-export with explicit interop docs (Next.js older configs, Jest without transform)
- TS Playground link wired into `package.json#homepage` AND GitHub repo `description` field — discoverable from `npm info promptkit` and search results, not just the README
- Side-by-side Vercel AI SDK before/after using a real multi-variable system prompt (user name, plan tier, locale) with a deliberate `{{usrName}}` vs `{{userName}}` typo — show the runtime output that would have shipped, then `tsc` catching it
- Stretch: open a PR/issue on the Vercel AI SDK repo proposing a `promptkit` example in the `generateText` docs

### Stack mapping

- **Frontend:** Svelte + MDsveX for the docs site; the TS Playground link is the primary launch surface and zero-infra
- **Backend / data:** none — pure utility library, no server, no database
- **AI layer:** Zod as a peer-optional dependency for runtime validation; no model SDK coupling, but an explicit Vercel AI SDK before/after demo is the headline integration story
- **Auth / payments:** none — OSS, no monetization surface, no API keys

### Week-by-week plan

- **Week 1:** Core tagged-template `prompt` function with template literal type inference; `.with({...})` exact-key enforcement; pluggable delimiter; ESM-only build with `promptkit/compat` CJS re-export; unit tests against imperfect TS inputs (union types, conditional types) to harden the inference. README first draft with the no-template-logic non-goal in paragraph one.
- **Week 2:** `.partial({...})` for multi-turn with the "partials do not compose" rule documented; `.validate()` (default `throw`) and `.validateSafe()` (Result) with Zod peer integration; `npx promptkit init` scaffold; CJS interop paragraph in README. Begin the Vercel AI SDK before/after demo using a real multi-variable system prompt.
- **Week 3:** Svelte + MDsveX docs site (lean — one Playground link is the demo); wire TS Playground URL into `package.json#homepage` and GitHub repo description; finalize the `{{usrName}}` vs `{{userName}}` before/after with runtime output and `tsc` catching it; publish to npm; open the stretch PR/issue on the Vercel AI SDK repo proposing a `promptkit` example in `generateText` docs.

### OSS vs paid

OSS is correct. A 2KB primitive has no monetization surface and shouldn't pretend otherwise — the value compounds through adoption, citations, and being the dependency inside p2/p3 if those ship. All four personas explicitly endorsed OSS for this proposal across both rounds. Monetization, if it ever happens, lives in a layer above (PromptRegistry's hosted UI is the natural candidate).

## Persona quotes (verbatim)

> "Right — so the TS Playground link *is* the docs, the demo, and the pitch all at once: you see a typo in `{{usrName}}` turn red before you've read a single word of the README, and at that point I don't need to explain why this matters." — Matt Pocock (round 2, p1)

> "Zero concerns that survive round 2. The delimiter is pluggable from day one so the Handlebars/Mustache collision is a non-issue. The no-template-logic line is a public non-goal in the README, which is the only form of scope discipline that actually holds. The before/after Vercel AI SDK demo makes the DX improvement legible without requiring a reader to already care. I looked hard for a remaining objection and I don't have one at this scope." — Matt Pocock (round 2, p1)

> "The TS Playground as the package homepage is a genuinely clever distribution insight. Most libraries waste their homepage on prose. This one ships a live, shareable error message — a typo in `{{usrName}}` turning red in the IDE. That's the whole pitch in a tab. That's how you get RT'd." — Guillermo Rauch (round 2, p1)

> "OK so here's the thing — someone finally just said 'template literals, type-safe, no DSL, done' and shipped it instead of building a compiler, and that's exactly why this one has a shot." — Theo Browne (round 2, p1)

> "Shipping a CLI that pastes into Actions is how you get a readme, not a product — the GitHub App is not a round-2 feature, it's the product." — Guillermo Rauch (round 2, p2) — preserved as the structural dissent on the runner-up

## Risks & legal flags

- **Legal/compliance:** clean across the board. Zero dependencies, Zod peer-optional, no data handling, no API calls baked into the library, no API keys stored. Nothing to review.
- **Vercel-absorbs-the-wedge risk (Addy):** if the Vercel AI SDK team ships typed prompt variables natively before promptkit reaches adoption, the differentiation collapses. Mitigation: land the `generateText` docs example PR early so promptkit is the de facto companion rather than a competitor.
- **Scope-creep pressure on `{{#if}}`:** every Handlebars-style library that tried to be clever died because it became a mini programming language nobody wanted to debug. The README first-paragraph non-goal is the firewall; closing the first GitHub issue with a link to it sets the precedent.
- **`.validate()` Result-vs-throw API friction:** Vercel AI SDK users throw by default. The decision to make `.validate()` throw and `.validateSafe()` return a Result resolves this — but it must be explained aggressively in the README or it becomes a PR magnet.
- **ESM-only silent breakage:** the `promptkit/compat` CJS re-export plus an explicit interop paragraph removes the biggest practical adoption blocker for teams on mixed pipelines (Next.js older configs, Jest without transform).
- **Discovery skew (Rauch):** "2026 is the year of Skills and CLIs" — a TS Playground link gets RTs from TS Twitter, but agent-prompt teams may skew Pythonic. The Vercel AI SDK PR is the bridge to that audience; passive OSS discoverability alone won't be enough.

## What we killed and why

Nothing was killed in this session. All three proposals survived round 2 — p1 promoted, p3 promoted, p2 iterated with one structural dissent preserved. The kill column is intentionally empty: every proposal cleared the legal/compliance and solo-shippable thresholds, and the panel converged on a coherent layered architecture (p2 and p3 both depend on p1's primitive) rather than rejecting any one bet outright.

## Open questions for the user

- **Cross-proposal sequencing:** p2 and p3 both depend on p1's tagged-template primitive. Even Rauch's hosted-first dissent on p2 doesn't change that ordering. Does this argue for shipping p1 first regardless, then deciding p2/p3 once p1 has adoption signal? The panel implicitly leans yes (Rauch r1: "Ship P1 first and dogfood it. Then PromptRegistry becomes 'we added a registry to the primitive devs already use'") but the user should confirm the explicit sequence before starting week 1.
- **Should p2 PromptDiff and p3 PromptRegistry ship as a follow-on suite, or focus solely on p1?** A "promptkit ecosystem" launch (primitive + diff + registry) tells a richer story but triples the timeline; a primitive-only launch keeps the discipline that earned the 9.0 score.
- **Rauch's hosted-first dissent on p2 is unresolved across two rounds.** He explicitly disagrees with the OSS-CLI-first majority (Matt, Theo, Addy): "The 'explicit round-2 consideration' hedge on a hosted App is planning theater — if you don't design the hosted layer into the architecture now, the CLI will calcify." A paid GitHub App as the actual product for p2 is worth a separate round-table session before committing to the OSS-CLI-first plan, because the migration cost from an OSS-CLI-only architecture to a hosted App later may be non-trivial.
- **Empirical open on p3 (Addy):** do PMs and domain experts actually edit raw JSON manifests in practice, or does "edit prompts without redeploying" require a UI? If the manifest is engineer-edited only, the no-redeploy pitch is weaker than it looks and a hosted UI becomes the natural paid follow-on. Cannot be answered from inside the panel — needs adoption data from a real user.
- **Default delimiter choice for p1:** the spec says pluggable from day one, but the default still has to be picked. `{{var}}` collides with Handlebars/Mustache; alternatives like `{var}` or `${var}` each carry their own connotations. Worth deciding before week 1 since it bakes into every example, the TS Playground demo, and the AI SDK before/after.
