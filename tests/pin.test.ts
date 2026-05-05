import { describe, it, expect } from 'vitest'
import { parsePin, PinError, formatPin } from '../src/pin'

describe('parsePin', () => {
  it('parses a valid Pin', () => {
    expect(parsePin('customer-summary@v1')).toEqual({ name: 'customer-summary', version: 'v1' })
  })

  it('parses Pin with multiple @ symbols (uses last one)', () => {
    expect(parsePin('a@b@v2')).toEqual({ name: 'a@b', version: 'v2' })
  })

  it('throws on malformed Pin (no @)', () => {
    expect(() => parsePin('noversion')).toThrow(PinError)
    expect(() => parsePin('noversion')).toThrow('Malformed Pin')
  })

  it('throws on malformed Pin (empty name)', () => {
    expect(() => parsePin('@v1')).toThrow(PinError)
  })

  it('throws on malformed Pin (empty version)', () => {
    expect(() => parsePin('name@')).toThrow(PinError)
  })
})

describe('formatPin', () => {
  it('formats a parsed Pin', () => {
    expect(formatPin({ name: 'greeting', version: 'v1' })).toBe('greeting@v1')
  })
})
