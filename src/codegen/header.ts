/**
 * Parse the header comment from a generated `.d.ts` file.
 */

export interface DtsHeader {
  manifestUrl: string
  pin: string
  hash: string
  generatedAt: string
}

export function parseDtsHeader(content: string): DtsHeader | null {
  const lines = content.split('\n')
  const header: Partial<DtsHeader> = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('//')) break

    const text = trimmed.slice(2).trim()
    if (text.startsWith('Manifest:')) {
      header.manifestUrl = text.slice('Manifest:'.length).trim()
    } else if (text.startsWith('Pin:')) {
      header.pin = text.slice('Pin:'.length).trim()
    } else if (text.startsWith('Hash:')) {
      header.hash = text.slice('Hash:'.length).trim()
    } else if (text.startsWith('Generated:')) {
      header.generatedAt = text.slice('Generated:'.length).trim()
    }
  }

  if (header.manifestUrl && header.pin && header.hash && header.generatedAt) {
    return header as DtsHeader
  }
  return null
}
