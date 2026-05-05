import { describe, it, expect } from 'vitest'
import {
  validateManifest,
  ManifestValidationError,
  type Manifest,
} from '../../src/manifest/schema.js'

describe('validateManifest', () => {
  const validManifest: Manifest = {
    'manifest-format-version': '1',
    prompts: [
      {
        name: 'customer-summary',
        version: 'v1',
        template: 'Hello {{customerName}}, your plan is {{planTier}}.',
        delimiter: { open: '{{', close: '}}' },
      },
    ],
  }

  it('accepts a valid manifest', () => {
    const result = validateManifest(validManifest)
    expect(result).toEqual(validManifest)
  })

  it('accepts a manifest with default delimiter', () => {
    const manifest = {
      'manifest-format-version': '1',
      prompts: [
        {
          name: 'greeting',
          version: 'v1',
          template: 'Hello {{name}}',
        },
      ],
    }
    const result = validateManifest(manifest)
    expect(result.prompts[0].delimiter).toEqual({ open: '{{', close: '}}' })
  })

  it('rejects duplicate name@version', () => {
    const manifest: Manifest = {
      'manifest-format-version': '1',
      prompts: [
        { name: 'greeting', version: 'v1', template: 'Hello {{name}}', delimiter: { open: '{{', close: '}}' } },
        { name: 'greeting', version: 'v1', template: 'Hi {{name}}', delimiter: { open: '{{', close: '}}' } },
      ],
    }
    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError)
    expect(() => validateManifest(manifest)).toThrow('Duplicate Pin "greeting@v1"')
    try {
      validateManifest(manifest)
    } catch (error) {
      expect((error as ManifestValidationError).code).toBe('duplicate-pin')
    }
  })

  it('rejects unknown top-level keys', () => {
    const manifest = {
      'manifest-format-version': '1',
      prompts: [{ name: 'greeting', version: 'v1', template: 'Hello' }],
      extraKey: 'should fail',
    }
    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError)
    expect(() => validateManifest(manifest)).toThrow('Unknown top-level keys: extraKey')
    try {
      validateManifest(manifest)
    } catch (error) {
      expect((error as ManifestValidationError).code).toBe('unknown-keys')
    }
  })

  it('rejects empty prompts array', () => {
    const manifest = {
      'manifest-format-version': '1',
      prompts: [],
    }
    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError)
    try {
      validateManifest(manifest)
    } catch (error) {
      expect((error as ManifestValidationError).code).toBe('empty-manifest')
    }
  })

  it('rejects invalid schema (missing required field)', () => {
    const manifest = {
      'manifest-format-version': '1',
      prompts: [{ name: 'greeting' }],
    }
    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError)
    try {
      validateManifest(manifest)
    } catch (error) {
      expect((error as ManifestValidationError).code).toBe('invalid-schema')
    }
  })

  it('rejects invalid manifest-format-version', () => {
    const manifest = {
      'manifest-format-version': '2',
      prompts: [{ name: 'greeting', version: 'v1', template: 'Hello' }],
    }
    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError)
  })
})
