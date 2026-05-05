/**
 * `promptregistry check --tsc` — intercept tsc --noEmit diagnostics and rewrite
 * those that involve generated prompt types into human-readable messages.
 *
 * Issue 010. The launch pitch.
 *
 * The rewriter handles two kinds of diagnostics:
 *
 *  1. Diagnostics whose source file is one of the generated `<name>.ts` files
 *     under outDir (e.g. tsc complains directly about `XxxVars` inside the
 *     generated module).
 *  2. Diagnostics whose source file is the user's call site (e.g.
 *     `examples/quickstart/src/main.ts`) but whose message text mentions a
 *     generated `XxxVars` type. This is the headline launch demo: the user
 *     drops a `.with({...})` key, tsc points at their call site, and we
 *     rewrite the message to name the offending pin.
 *
 * The rewriter is pure: same diagnostics + same outDir contents → same output.
 */

import { spawn } from 'node:child_process'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { relative, resolve, join } from 'node:path'
import { parseDtsHeader } from '../codegen/header.js'
import {
  rewrittenRemovedVariable,
  rewrittenTypeContractChanged,
} from './messages.js'

export interface TscDiagnostic {
  file?: { fileName: string }
  start?: number
  /** 1-based line number, when known. Used to anchor the rewritten call-site reference. */
  line?: number
  code: number
  messageText: string | { messageText: string }
  category: number
}

export interface RewrittenDiagnostic {
  original: TscDiagnostic
  rewritten: string
}

export async function runTscRewrite(
  cwd: string,
  outDir: string,
): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolveRun) => {
    const tsc = spawn('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    tsc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    tsc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    tsc.on('close', (exitCode) => {
      const diagnostics = parseTscOutput(stdout + stderr)
      const rewritten = rewriteDiagnostics(diagnostics, cwd, outDir)

      const output = rewritten
        .map((d) => d.rewritten)
        .join('\n')

      resolveRun({ exitCode: exitCode ?? 1, output })
    })
  })
}

function parseTscOutput(output: string): TscDiagnostic[] {
  // Try to parse as JSON first (tsc --noEmit with json output)
  try {
    const lines = output.trim().split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    }
  } catch {
    // Fall through to regex parsing
  }

  // Fallback: regex parse typical tsc output lines. tsc emits the primary
  // diagnostic on one line and follow-on context indented underneath; we
  // fold those continuation lines into the messageText so downstream
  // matchers can see e.g. the nested "Property 'X' is missing" line.
  const diagnostics: TscDiagnostic[] = []
  const headRegex = /^(.+?)\((\d+),(\d+)\): error TS(\d+): (.*)$/
  const lines = output.split(/\r?\n/)

  let current: TscDiagnostic | null = null
  for (const line of lines) {
    const match = headRegex.exec(line)
    if (match) {
      if (current) diagnostics.push(current)
      current = {
        file: { fileName: match[1] },
        line: parseInt(match[2], 10),
        code: parseInt(match[4], 10),
        messageText: match[5],
        category: 1,
      }
    } else if (current && /^\s+\S/.test(line)) {
      // Indented continuation line — append to messageText.
      const text = typeof current.messageText === 'string'
        ? current.messageText
        : current.messageText.messageText
      current.messageText = text + '\n' + line.trim()
    } else if (current && line.trim() === '') {
      // Blank line ends the current diagnostic block.
      diagnostics.push(current)
      current = null
    }
  }
  if (current) diagnostics.push(current)

  return diagnostics
}

/**
 * Index of `XxxVars` type names found in generated files in outDir, mapped to
 * the parsed header (so we can recover the pin). Built lazily once per
 * `rewriteDiagnostics` invocation.
 */
interface GeneratedTypeIndex {
  /** Map from type name (e.g. `CustomerSummaryVars`) to header info. */
  byTypeName: Map<string, { pin: string; filePath: string }>
}

function buildGeneratedTypeIndex(outDir: string): GeneratedTypeIndex {
  const byTypeName = new Map<string, { pin: string; filePath: string }>()
  if (!existsSync(outDir)) return { byTypeName }

  let entries: string[]
  try {
    entries = readdirSync(outDir)
  } catch {
    return { byTypeName }
  }

  for (const file of entries) {
    if (!file.endsWith('.ts') || file === 'registry.ts') continue
    const filePath = join(outDir, file)
    let content: string
    try {
      content = readFileSync(filePath, 'utf-8')
    } catch {
      continue
    }
    const header = parseDtsHeader(content)
    if (!header) continue
    // Match `export type XxxVars` declarations.
    const typeMatch = content.match(/export\s+type\s+([A-Za-z_][A-Za-z0-9_]*Vars)\b/)
    if (!typeMatch) continue
    byTypeName.set(typeMatch[1], { pin: header.pin, filePath })
  }
  return { byTypeName }
}

export function rewriteDiagnostics(
  diagnostics: TscDiagnostic[],
  cwd: string,
  outDir: string,
): RewrittenDiagnostic[] {
  const index = buildGeneratedTypeIndex(outDir)
  return diagnostics.map((diag) => {
    const rewritten = tryRewriteDiagnostic(diag, cwd, outDir, index)
    return {
      original: diag,
      rewritten: rewritten ?? formatOriginalDiagnostic(diag),
    }
  })
}

function tryRewriteDiagnostic(
  diag: TscDiagnostic,
  cwd: string,
  outDir: string,
  index: GeneratedTypeIndex,
): string | null {
  if (!diag.file) return null

  const messageText = typeof diag.messageText === 'string'
    ? diag.messageText
    : diag.messageText.messageText

  const filePath = resolve(cwd, diag.file.fileName)
  const relativeToOut = relative(outDir, filePath)
  const insideOutDir =
    filePath.endsWith('.ts') &&
    !relativeToOut.startsWith('..') &&
    relativeToOut !== 'registry.ts'

  // Case 1: diagnostic comes from a generated file. Use that file's header
  // for the pin.
  if (insideOutDir) {
    if (!existsSync(filePath)) return null
    const content = readFileSync(filePath, 'utf-8')
    const header = parseDtsHeader(content)
    if (!header) return null

    const varName = extractMissingVarName(messageText)
    if (varName) {
      return rewrittenRemovedVariable({
        pin: header.pin,
        varName,
        file: relativePath(cwd, filePath),
        line: diag.line ?? 1,
      })
    }
    return rewrittenTypeContractChanged(header.pin)
  }

  // Case 2: diagnostic comes from the user's call site, but mentions a
  // generated XxxVars type. Look up the matching generated file by type
  // name.
  const typeName = findGeneratedTypeName(messageText, index)
  if (!typeName) return null

  const entry = index.byTypeName.get(typeName)
  if (!entry) return null

  const varName = extractMissingVarName(messageText)
  if (varName) {
    return rewrittenRemovedVariable({
      pin: entry.pin,
      varName,
      file: relativePath(cwd, filePath),
      line: diag.line ?? 1,
    })
  }
  return rewrittenTypeContractChanged(entry.pin)
}

function findGeneratedTypeName(
  messageText: string,
  index: GeneratedTypeIndex,
): string | null {
  for (const typeName of index.byTypeName.keys()) {
    // Match the type name as a whole identifier — the message text quotes
    // types in single quotes (`'CustomerSummaryVars'`) but we accept any
    // word-boundary occurrence to be tolerant of tsc phrasings.
    const pattern = new RegExp(`\\b${escapeRegex(typeName)}\\b`)
    if (pattern.test(messageText)) return typeName
  }
  return null
}

function extractMissingVarName(messageText: string): string | null {
  const patterns: RegExp[] = [
    /Property ['"](?<name>\w+)['"] does not exist/,
    /Property ['"](?<name>\w+)['"] is missing/,
    /missing the following properties from type ['"][^'"]+['"]: (?<name>\w+)/,
  ]
  for (const pattern of patterns) {
    const match = messageText.match(pattern)
    const name = match?.groups?.name
    if (name) return name
  }
  return null
}

function formatOriginalDiagnostic(diag: TscDiagnostic): string {
  const file = diag.file?.fileName ?? 'unknown'
  const message = typeof diag.messageText === 'string'
    ? diag.messageText
    : diag.messageText.messageText
  return `${file}: error TS${diag.code}: ${message}`
}

function relativePath(cwd: string, filePath: string): string {
  const rel = relative(cwd, filePath)
  // Keep the path slash style normalized for byte-stable output across
  // platforms. tsc emits forward slashes in its diagnostics on Windows too,
  // so we follow suit.
  return rel.split(/[\\/]/).join('/')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
