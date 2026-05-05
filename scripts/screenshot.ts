// scripts/screenshot.ts
// Regenerates the README hero assets:
//   - docs/hero-tsc.svg   — the rewritten tsc error after the PM removed a variable
//   - docs/hero-diff.svg  — manifest before/after as a unified diff
//
// The script:
//   1. Runs codegen against examples/quickstart with the original manifest.
//   2. Copies the example into a tmp dir and removes `joinDate` from the
//      customer-summary template.
//   3. Re-runs codegen in the tmp dir, then `tsc --noEmit --pretty false`.
//   4. Captures the resulting tsc error message and renders it to an SVG.
//   5. Renders the manifest diff to a second SVG.
//
// SVGs are hand-rolled so the script doesn't depend on `silicon` / `freeze`.

import { execSync, spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const exampleDir = path.join(repoRoot, 'examples', 'quickstart')
const docsDir = path.join(repoRoot, 'docs')
const cliEntry = path.join(repoRoot, 'dist', 'cli', 'index.js')

if (!fs.existsSync(cliEntry)) {
  console.error(`[screenshot] missing ${cliEntry}; run \`npm run build\` first.`)
  process.exit(1)
}

fs.mkdirSync(docsDir, { recursive: true })

// --- 1. Snapshot the original manifest -------------------------------------
const originalManifestPath = path.join(exampleDir, 'manifest.json')
const originalManifest = fs.readFileSync(originalManifestPath, 'utf8')

// --- 2. Build a tmp copy of the example with `joinDate` removed -----------
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'promptregistry-screenshot-'))
copyDir(exampleDir, tmpRoot, ['node_modules', 'prompts/.generated'])

const editedManifestPath = path.join(tmpRoot, 'manifest.json')
const editedManifest = originalManifest
  .replace(' They joined on {{joinDate}}.', '')
const parsedEdited = JSON.parse(editedManifest)
fs.writeFileSync(editedManifestPath, JSON.stringify(parsedEdited, null, 2) + '\n', 'utf8')

// Wire promptregistry as a direct path import from repoRoot/dist
const tmpPkgPath = path.join(tmpRoot, 'package.json')
const tmpPkg = JSON.parse(fs.readFileSync(tmpPkgPath, 'utf8'))
tmpPkg.dependencies = { ...(tmpPkg.dependencies ?? {}), promptregistry: `file:${repoRoot}` }
fs.writeFileSync(tmpPkgPath, JSON.stringify(tmpPkg, null, 2) + '\n', 'utf8')

// --- 3. Generate code in the tmp dir, then run tsc ------------------------
spawnSync('node', [cliEntry, 'codegen', '--manifest', './manifest.json', '--out', './prompts/.generated'], {
  cwd: tmpRoot,
  stdio: 'inherit',
})

// Symlink node_modules from the example so `tsx` / `typescript` are resolvable.
const tmpNodeModules = path.join(tmpRoot, 'node_modules')
const exampleNodeModules = path.join(exampleDir, 'node_modules')
if (!fs.existsSync(tmpNodeModules) && fs.existsSync(exampleNodeModules)) {
  try { fs.symlinkSync(exampleNodeModules, tmpNodeModules, 'dir') } catch { /* noop */ }
}

let tscOutput = ''
try {
  const result = spawnSync('npx', ['--no-install', 'tsc', '--noEmit', '--pretty', 'false'], {
    cwd: tmpRoot,
    encoding: 'utf8',
  })
  tscOutput = (result.stdout || '') + (result.stderr || '')
  if (!tscOutput.trim()) {
    tscOutput = '(tsc produced no output — did the example fixture change?)'
  }
} catch (err) {
  tscOutput = String((err as Error).message)
}

// Rewrite tmp paths to a cleaner relative form, and keep only the lines
// that reference the prompt-driven mismatch — drop noise like missing `console`
// types caused by the tmp dir not having @types/node hoisted.
const cleanedTscOutput = tscOutput
  .split('\n')
  .map((line) => line.replace(tmpRoot + path.sep, '').replace(tmpRoot, '.'))
  .filter((line) => !line || /Vars|customer-summary|joinDate|customerSummary/i.test(line) || /^error /.test(line))
  .join('\n')
  .trim()

// --- 4. Render hero-tsc.svg -----------------------------------------------
writeTerminalSvg(
  path.join(docsDir, 'hero-tsc.svg'),
  '$ tsc --noEmit',
  cleanedTscOutput,
)

// --- 5. Render hero-diff.svg ----------------------------------------------
const diffText = unifiedDiff('manifest.json (before)', 'manifest.json (after)', originalManifest, editedManifest)
writeTerminalSvg(
  path.join(docsDir, 'hero-diff.svg'),
  '$ git diff manifest.json',
  diffText,
  { highlightDiff: true },
)

// --- 6. Cleanup ------------------------------------------------------------
fs.rmSync(tmpRoot, { recursive: true, force: true })

const tscBytes = fs.statSync(path.join(docsDir, 'hero-tsc.svg')).size
const diffBytes = fs.statSync(path.join(docsDir, 'hero-diff.svg')).size
console.log(`[screenshot] wrote docs/hero-tsc.svg (${tscBytes} bytes)`)
console.log(`[screenshot] wrote docs/hero-diff.svg (${diffBytes} bytes)`)

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function copyDir(src: string, dest: string, exclude: string[] = []): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const rel = entry.name
    if (exclude.some((ex) => ex === rel || ex.startsWith(rel + '/'))) continue
    const from = path.join(src, rel)
    const to = path.join(dest, rel)
    if (entry.isDirectory()) {
      // Recursively, with sub-exclusions
      const nestedExclude = exclude
        .filter((ex) => ex.startsWith(rel + '/'))
        .map((ex) => ex.slice(rel.length + 1))
      copyDir(from, to, nestedExclude)
    } else if (entry.isSymbolicLink()) {
      // skip
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

function unifiedDiff(labelA: string, labelB: string, a: string, b: string): string {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const out: string[] = []
  out.push(`--- ${labelA}`)
  out.push(`+++ ${labelB}`)
  out.push(`@@ -1,${aLines.length} +1,${bLines.length} @@`)
  // Simplistic line-by-line diff (good enough for a 12-line manifest).
  const max = Math.max(aLines.length, bLines.length)
  for (let i = 0; i < max; i++) {
    const ai = aLines[i]
    const bi = bLines[i]
    if (ai === bi) {
      if (ai !== undefined) out.push(' ' + ai)
    } else {
      if (ai !== undefined) out.push('-' + ai)
      if (bi !== undefined) out.push('+' + bi)
    }
  }
  return out.join('\n')
}

interface SvgOptions {
  highlightDiff?: boolean
}

function writeTerminalSvg(outPath: string, header: string, body: string, opts: SvgOptions = {}): void {
  const lines = body.split('\n')
  const headerLines = header ? [header, ''] : []
  const allLines = [...headerLines, ...lines]
  const lineHeight = 20
  const padding = 18
  const charWidth = 8
  const maxLen = allLines.reduce((m, l) => Math.max(m, l.length), 0)
  const width = Math.max(640, Math.min(1200, maxLen * charWidth + padding * 2))
  const height = allLines.length * lineHeight + padding * 2

  const tspans = allLines
    .map((line, i) => {
      const y = padding + (i + 1) * lineHeight - 4
      let color = '#c9d1d9'
      if (i < headerLines.length && line.startsWith('$')) color = '#7ee787'
      else if (opts.highlightDiff) {
        if (line.startsWith('+++') || line.startsWith('---')) color = '#79c0ff'
        else if (line.startsWith('@@')) color = '#d2a8ff'
        else if (line.startsWith('+')) color = '#7ee787'
        else if (line.startsWith('-')) color = '#ff7b72'
      } else {
        if (line.includes('error TS')) color = '#ff7b72'
        else if (/Pin|@v\d|Vars/.test(line)) color = '#79c0ff'
      }
      return `<tspan x="${padding}" y="${y}" xml:space="preserve" fill="${color}">${escapeXml(line) || ' '}</tspan>`
    })
    .join('\n')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace" font-size="14">
  <rect width="100%" height="100%" fill="#0d1117" rx="8" ry="8"/>
  <text>
${tspans}
  </text>
</svg>
`
  fs.writeFileSync(outPath, svg, 'utf8')
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
