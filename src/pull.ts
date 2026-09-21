/**
 * Internal `pull()` utility: resolves a Pin against a Manifest and returns
 * a CompiledTemplate.
 *
 * Not exported from the package. Consumed only by generated code in the barrel.
 * See ADR-0004.
 */

import { compile } from './runtime.js'
import type { CompiledTemplate } from './runtime.js'
import type { Manifest, PromptEntry } from './manifest/schema.js'
import { parsePin } from './pin.js'

export interface PullError extends Error {
  code: 'unknown-name' | 'unknown-version' | 'malformed-pin'
}

export function pull(pin: string, manifest: Manifest): CompiledTemplate {
  const parsed = parsePin(pin)

  const entry = manifest.prompts.find((p) => p.name === parsed.name)
  if (!entry) {
    const error = new Error(`Unknown prompt name: "${parsed.name}"`) as PullError
    error.code = 'unknown-name'
    throw error
  }

  if (entry.version !== parsed.version) {
    const error = new Error(
      `Unknown version "${parsed.version}" for prompt "${parsed.name}" (available: ${entry.version})`,
    ) as PullError
    error.code = 'unknown-version'
    throw error
  }

  return entryToCompiledTemplate(entry)
}

function entryToCompiledTemplate(entry: PromptEntry): CompiledTemplate {
  return compile(entry.template, entry.delimiter)
}
