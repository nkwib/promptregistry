import { describe, it, expect } from 'vitest'
import { compile } from '../src/runtime'

describe('runtime / promptkit', () => {
  it('renders a basic template', () => {
    const t = compile<{ name: string }>('Hello {{name}}!', { open: '{{', close: '}}' })
    expect(t.with({ name: 'Ada' })).toBe('Hello Ada!')
  })

  it('throws on missing variable', () => {
    const t = compile('Hello {{name}}!', { open: '{{', close: '}}' })
    expect(() => t.with({})).toThrow(/Missing variable: name/)
  })

  it('partial() returns a chainable CompiledTemplate', () => {
    const t = compile<{ first: string; second: string }>(
      '{{first}} and {{second}}',
      { open: '{{', close: '}}' },
    )
    const half = t.partial({ first: 'Ada' })
    expect(half.placeholders).toEqual(['second'])
    expect(half.with({ second: 'Grace' } as never)).toBe('Ada and Grace')
  })

  it('partial().partial().with() works without recursion', () => {
    const t = compile<{ a: string; b: string; c: string }>(
      '{{a}}-{{b}}-{{c}}',
      { open: '{{', close: '}}' },
    )
    const step1 = t.partial({ a: 'A' })
    const step2 = step1.partial({ b: 'B' })
    expect(step2.placeholders).toEqual(['c'])
    expect(step2.with({ c: 'C' } as never)).toBe('A-B-C')
  })

  it('repeated placeholders are deduped and replaced everywhere', () => {
    const t = compile<{ name: string }>('{{name}} hi {{name}}', { open: '{{', close: '}}' })
    expect(t.placeholders).toEqual(['name'])
    expect(t.with({ name: 'Ada' })).toBe('Ada hi Ada')
  })
})
