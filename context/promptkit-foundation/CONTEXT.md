# promptkit

A 2KB tagged-template TypeScript library that makes LLM prompt variables a first-class type. A typo in `{{usrName}}` becomes a `tsc` error before it reaches the model.

## Language

**Tagged template**:
The `prompt` function invoked as `` prompt`...` ``. The tag receives the literal source segments via `strings.raw`, which is what the parser inspects to extract placeholder names — TypeScript performs the same extraction at the type level on the template literal type.
_Avoid_: tag function (in user-facing docs), template tag (ambiguous with HTML)

**Delimiter**:
The pair of character sequences that wrap a placeholder in source. Default is `{{` … `}}`. Pluggable per-call site via a parser argument.
_Avoid_: braces (default-only), markers, brackets

**Placeholder**:
The named slot inside the delimiter, e.g. the `userName` in `{{userName}}`. Always a single identifier matching `[A-Za-z_][A-Za-z0-9_]*`. Never an expression.
_Avoid_: variable (overloaded with the runtime values object), interpolation (suggests JS `${}`), slot (overloaded with Web Components)

**Variables object**:
The object passed to `.with({...})` or `.partial({...})`. Its required keys are inferred from the placeholders in the template.
_Avoid_: bindings, params, context

**Parser**:
The pair (delimiter-pair, placeholder regex) that extracts placeholders at runtime AND the matching template literal type that extracts them at compile time. Both halves must agree or types and runtime drift apart.
_Avoid_: lexer, tokenizer

**Compiled template**:
The value returned by the `prompt` tag — carries the original `strings`, the inferred placeholder set, and the `.with` / `.partial` / `.validate` / `.validateSafe` methods.
_Avoid_: rendered template (suggests `.with()` was already called)

## Relationships

- A **Tagged template** invocation produces a **Compiled template** typed by the **Placeholder** set extracted from its source under the active **Parser**.
- The **Parser** is the single source of truth: its delimiter pair governs both runtime extraction and the compile-time template literal type. Changing the parser changes both halves in lock-step or the abstraction is broken.
- A **Variables object** must structurally match the **Placeholder** set of the **Compiled template** it is applied to.

## Example dialogue

> **Dev:** "If I switch the delimiter to `{var}`, do I need a different `prompt` import?"
> **Library author:** "No — the `prompt` tag accepts a parser argument. The compile-time template literal type is generic over the delimiter pair, so the same import handles both. The parser is the unit of variation, not the tag."

> **Dev:** "Can I put a placeholder inside another placeholder, like `{{ {{inner}} }}`?"
> **Library author:** "No. A placeholder is a single identifier — never an expression. If you need composition, use `.partial({...})` to pre-bind some keys, then `.with({...})` for the rest."

## Flagged ambiguities

- "variable" was used for both the placeholder name and the runtime value — resolved: the source-level slot is a **Placeholder**, and the runtime values are the **Variables object**.
- "delimiter" was almost used to mean *just the opening sequence* (`{{`) — resolved: a **Delimiter** is the pair `(open, close)`, never one half alone.
