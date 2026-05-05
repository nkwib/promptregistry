---
status: accepted
---

# Default delimiter is `{{var}}`

The default placeholder delimiter is the double-brace `{{` … `}}` pair. The parser is pluggable per call site, but the un-configured default — the one that ships in every README example, the TS Playground homepage link, and the Vercel AI SDK before/after demo — uses `{{var}}`.

## Why

Three reasons, in order of weight:

1. **JSON-output collision safety.** LLM prompts routinely contain literal JSON examples (`Output: {"user": "alice"}`), schema hints (`return shape: {name, email, plan}`), and other single-brace content. A `{var}` parser using the standard `[A-Za-z_]\w*` placeholder regex would silently match identifiers inside that content and demand them as required keys on `.with({...})`. Double-brace makes accidental matches almost impossible.
2. **Convention alignment.** LangChain, BAML, OpenAI's prompt cookbook, and Anthropic's prompt library all use `{{var}}`. The TS Playground demo lands readers in a syntax they already recognise from the LLM-prompt ecosystem; no convention-translation tax before the type-error wedge fires.
3. **Reader-side discoverability.** A `{{usrName}}` typo turning red in the IDE reads as a typed prompt-template error to anyone who has touched a prompt library. `{var}` would read as a Python f-string or a CSS-in-JS token first, and a prompt placeholder second.

## Considered options

- **`{{var}}`** — chosen. See above.
- **`{var}`** — rejected as the default. Real subcommunity (LangChain/BAML port users, Python-influenced teams) but the JSON-collision footgun is unacceptable for the un-configured path. Shipped as a named export (`promptkit/single-brace` or `promptkit/fstring` — exact module name decided at code time) so opt-in is one import away.
- **`${var}`** — rejected. This is the literal JS template-literal interpolation syntax. Inside a tagged template, `${name}` is evaluated by the JS runtime *before* the tag function ever runs — both `strings.raw` already contains the substituted value and `name` must be lexically in scope or you get `ReferenceError`. There is no static placeholder name to extract at the type level. Choosing it would defeat the type-inference wedge that is the entire premise of the library.
- **`$var`** — rejected. A sigil-prefix form (no closing delimiter, no JS-interpolation conflict because `$var` is not template-literal syntax) is technically extractable. Rejected for two reasons: (a) visual confusion with `${var}` will lead readers to assume runtime JS interpolation and write code that breaks at the first scoping mistake; (b) old-school feel — sigil-prefix templating reads as Perl/PHP-era, against the modern-TS aesthetic of the library.

## Consequences

- The `package.json#homepage` TS Playground link, the `npx promptkit init` scaffold, the README first-paragraph example, and the Vercel AI SDK before/after demo all use `{{var}}`. Changing the default later would require updating all of those surfaces in lock-step and would break inbound links to the Playground.
- The `{var}` named export ships from day one, not as a follow-up — otherwise the LangChain/BAML port subcommunity has no migration path and ends up reaching for a different library.
- Examples and the TS Playground demo must avoid prompts that themselves contain literal `{{` `}}` (i.e. don't write a prompt about Mustache syntax in the demo). The vanishingly small set of prompts that *do* legitimately need to emit `{{` `}}` characters can switch parser at the call site.
