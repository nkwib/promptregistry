/**
 * promptkit stub — to be replaced by the real `promptkit` / `tprompt` npm package.
 *
 * Implements the minimal API surface that PromptRegistry depends on:
 * - `makePromptTag({ open, close })` factory
 * - Tagged-template function returning a CompiledTemplate
 * - `.with()`, `.partial()`, `.validate()`, `.validateSafe()` methods
 * - Type-level placeholder extraction from template literal types
 *
 * This stub is intentionally minimal. The real promptkit will have more
 * sophisticated type inference and runtime features.
 */

// ---------------------------------------------------------------------------
// Type-level placeholder extraction
// ---------------------------------------------------------------------------

type ExtractFromString<
  S extends string,
  Open extends string,
  Close extends string,
> = S extends `${string}${Open}${infer Name}${Close}${infer Rest}`
  ? Name extends ''
    ? ExtractFromString<Rest, Open, Close>
    : Name | ExtractFromString<Rest, Open, Close>
  : never

type ExtractFromStrings<
  Strings extends readonly string[],
  Open extends string,
  Close extends string,
> = Strings extends readonly [infer First, ...infer Rest]
  ? First extends string
    ? Rest extends readonly string[]
      ? ExtractFromString<First, Open, Close> | ExtractFromStrings<Rest, Open, Close>
      : ExtractFromString<First, Open, Close>
    : never
  : never

type PlaceholderSet<
  Strings extends readonly string[],
  Open extends string,
  Close extends string,
> = ExtractFromStrings<Strings, Open, Close> extends never
  ? never
  : ExtractFromStrings<Strings, Open, Close>

type VarsObject<Keys extends string> = {
  [K in Keys]: string
}

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

export interface CompiledTemplate<Vars extends Record<string, string> = Record<string, string>> {
  readonly strings: TemplateStringsArray
  readonly placeholders: readonly string[]

  with(vars: Vars): string

  partial(vars: Partial<Vars>): CompiledTemplate<Vars>

  validate(schema: unknown): string
  validateSafe(schema: unknown): { success: true; data: string } | { success: false; error: Error }
}

export interface PromptTag<
  Open extends string = string,
  Close extends string = string,
> {
  <Strings extends TemplateStringsArray>(
    strings: Strings,
    ...values: unknown[]
  ): CompiledTemplate<VarsObject<PlaceholderSet<Strings, Open, Close> & string>>
}

export function makePromptTag<Open extends string, Close extends string>({
  open,
  close,
}: {
  open: Open
  close: Close
}): PromptTag<Open, Close> {
  const placeholderRegex = new RegExp(
    `${escapeRegex(open)}([A-Za-z_][A-Za-z0-9_]*)${escapeRegex(close)}`,
    'g',
  )

  function buildCompiled(strings: TemplateStringsArray): CompiledTemplate {
    const source = strings.raw.join('')
    const placeholders = [...source.matchAll(placeholderRegex)].map((m) => m[1])
    const uniquePlaceholders = [...new Set(placeholders)]

    function render(vars: Record<string, string>): string {
      let result = source
      for (const placeholder of uniquePlaceholders) {
        const value = vars[placeholder]
        if (value === undefined) {
          throw new Error(`Missing variable: ${placeholder}`)
        }
        result = result.replace(
          new RegExp(`${escapeRegex(open)}${placeholder}${escapeRegex(close)}`, 'g'),
          String(value),
        )
      }
      return result
    }

    function partial(vars: Record<string, string>): CompiledTemplate {
      let result = source
      for (const placeholder of uniquePlaceholders) {
        if (placeholder in vars && vars[placeholder] !== undefined) {
          result = result.replace(
            new RegExp(`${escapeRegex(open)}${placeholder}${escapeRegex(close)}`, 'g'),
            String(vars[placeholder]),
          )
        }
      }
      const newStrings = Object.assign([result], { raw: [result] }) as unknown as TemplateStringsArray
      return buildCompiled(newStrings)
    }

    return {
      strings,
      placeholders: uniquePlaceholders,
      with: render,
      partial,
      validate(_schema: unknown): string {
        return render({})
      },
      validateSafe(_schema: unknown) {
        try {
          return { success: true as const, data: render({}) }
        } catch (error) {
          return {
            success: false as const,
            error: error instanceof Error ? error : new Error(String(error)),
          }
        }
      },
    }
  }

  return function prompt(strings: TemplateStringsArray, ..._values: unknown[]): CompiledTemplate {
    return buildCompiled(strings)
  } as PromptTag<Open, Close>
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Default prompt tag with {{ }} delimiter
export const prompt = makePromptTag({ open: '{{', close: '}}' })
