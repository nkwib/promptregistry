/**
 * Pin parsing — a `name@version` string.
 */

export interface ParsedPin {
  name: string
  version: string
}

export class PinError extends Error {
  constructor(
    message: string,
    public readonly code: 'malformed-pin' | 'unknown-name' | 'unknown-version',
  ) {
    super(message)
    this.name = 'PinError'
  }
}

export function parsePin(pin: string): ParsedPin {
  const atIndex = pin.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === pin.length - 1) {
    throw new PinError(`Malformed Pin: "${pin}" (expected "name@version")`, 'malformed-pin')
  }

  const name = pin.slice(0, atIndex)
  const version = pin.slice(atIndex + 1)

  if (name.length === 0 || version.length === 0) {
    throw new PinError(`Malformed Pin: "${pin}" (expected "name@version")`, 'malformed-pin')
  }

  return { name, version }
}

export function formatPin(parsed: ParsedPin): string {
  return `${parsed.name}@${parsed.version}`
}
