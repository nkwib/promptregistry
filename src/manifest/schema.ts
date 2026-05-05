/**
 * Manifest schema and runtime validation.
 *
 * The Manifest is the load-bearing wire format between the remote bucket
 * and every CLI subcommand.
 */

import { z } from 'zod'

export const delimiterSchema = z.object({
  open: z.string().min(1),
  close: z.string().min(1),
})

export const promptEntrySchema = z.object({
  name: z.string().min(1).regex(/^[A-Za-z0-9-_]+$/),
  version: z.string().min(1),
  template: z.string(),
  delimiter: delimiterSchema.default({ open: '{{', close: '}}' }),
})

export const manifestSchema = z.object({
  'manifest-format-version': z.literal('1'),
  prompts: z.array(promptEntrySchema),
})

export type Manifest = z.infer<typeof manifestSchema>
export type PromptEntry = z.infer<typeof promptEntrySchema>
export type Delimiter = z.infer<typeof delimiterSchema>

export class ManifestValidationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'duplicate-pin'
      | 'invalid-schema'
      | 'empty-manifest'
      | 'unknown-keys',
  ) {
    super(message)
    this.name = 'ManifestValidationError'
  }
}

export function validateManifest(data: unknown): Manifest {
  // Check for unknown top-level keys before Zod parsing
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const allowedKeys = new Set(['manifest-format-version', 'prompts'])
    const unknownKeys = Object.keys(data).filter((k) => !allowedKeys.has(k))
    if (unknownKeys.length > 0) {
      throw new ManifestValidationError(
        `Unknown top-level keys: ${unknownKeys.join(', ')}`,
        'unknown-keys',
      )
    }
  }

  let manifest: Manifest
  try {
    manifest = manifestSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new ManifestValidationError(`Invalid manifest: ${issues}`, 'invalid-schema')
    }
    throw new ManifestValidationError(String(error), 'invalid-schema')
  }

  if (manifest.prompts.length === 0) {
    throw new ManifestValidationError('Manifest contains no prompts', 'empty-manifest')
  }

  // Check for duplicate name@version combinations
  const seen = new Map<string, number>()
  for (let i = 0; i < manifest.prompts.length; i++) {
    const entry = manifest.prompts[i]
    const pin = `${entry.name}@${entry.version}`
    if (seen.has(pin)) {
      const firstIndex = seen.get(pin)!
      throw new ManifestValidationError(
        `Duplicate Pin "${pin}" at index ${firstIndex} and ${i}`,
        'duplicate-pin',
      )
    }
    seen.set(pin, i)
  }

  return manifest
}
