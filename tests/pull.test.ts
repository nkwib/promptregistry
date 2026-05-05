import { describe, it, expect } from 'vitest'
import { pull } from '../src/pull'
import type { Manifest } from '../src/manifest/schema'

describe('pull', () => {
  const manifest: Manifest = {
    'manifest-format-version': '1',
    prompts: [
      {
        name: 'greeting',
        version: 'v1',
        template: 'Hello {{name}}, welcome to {{planTier}}!',
        delimiter: { open: '{{', close: '}}' },
      },
    ],
  }

  it('returns a CompiledTemplate for a valid Pin', () => {
    const compiled = pull('greeting@v1', manifest)
    expect(compiled.placeholders).toEqual(['name', 'planTier'])
    expect(compiled.with({ name: 'Ada', planTier: 'Pro' })).toBe('Hello Ada, welcome to Pro!')
  })

  it('throws on unknown name', () => {
    expect(() => pull('unknown@v1', manifest)).toThrow('Unknown prompt name')
  })

  it('throws on unknown version', () => {
    expect(() => pull('greeting@v2', manifest)).toThrow('Unknown version')
  })

  it('throws on malformed Pin', () => {
    expect(() => pull('badpin', manifest)).toThrow('Malformed Pin')
  })
})
