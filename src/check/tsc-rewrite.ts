/**
 * `promptregistry check --tsc` — intercept tsc --noEmit diagnostics and rewrite
 * those from generated .d.ts files into human-readable messages.
 *
 * Issue 010. The launch pitch.
 */

import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { parseDtsHeader } from '../codegen/header.js'

export interface TscDiagnostic {
  file?: { fileName: string }
  start?: number
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
  return new Promise((resolve) => {
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

      resolve({ exitCode: exitCode ?? 1, output })
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

  // Fallback: regex parse typical tsc output lines
  const diagnostics: TscDiagnostic[] = []
  const regex = /^(.+)\((\d+),(\d+)\): error TS(\d+): (.+)$/gm
  let match: RegExpExecArray | null

  while ((match = regex.exec(output)) !== null) {
    diagnostics.push({
      file: { fileName: match[1] },
      code: parseInt(match[4], 10),
      messageText: match[5],
      category: 1,
    })
  }

  return diagnostics
}

function rewriteDiagnostics(
  diagnostics: TscDiagnostic[],
  cwd: string,
  outDir: string,
): RewrittenDiagnostic[] {
  return diagnostics.map((diag) => {
    const rewritten = tryRewriteDiagnostic(diag, cwd, outDir)
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
): string | null {
  if (!diag.file) return null

  const filePath = resolve(cwd, diag.file.fileName)
  const relativeToOut = relative(outDir, filePath)

  // Only rewrite diagnostics from generated files in outDir
  if (!filePath.endsWith('.ts') || relativeToOut.startsWith('..') || relativeToOut === 'registry.ts') {
    return null
  }

  // Read the generated header to get the Pin
  if (!existsSync(filePath)) return null

  const content = readFileSync(filePath, 'utf-8')
  const header = parseDtsHeader(content)
  if (!header) return null

  const messageText = typeof diag.messageText === 'string'
    ? diag.messageText
    : diag.messageText.messageText

  const varName = extractMissingVarName(messageText)
  if (varName) {
    return `Remote prompt '${header.pin}' removed variable '${varName}' — update your call site or pin to a previous version.`
  }

  // Generic rewrite for any diagnostic from a generated file
  return `Remote prompt '${header.pin}' type contract changed — run 'promptregistry codegen' to update or pin to a previous version.`
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
