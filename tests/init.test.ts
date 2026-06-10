import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PromptRegistryConfig } from '../src/cli/config'

/**
 * `init` is intentionally lazy-loaded: it imports `typescript` dynamically
 * so that consumers without the optional peer dep don't pay the cost.
 * Tests follow the same pattern — we never import `init` at module scope.
 */
async function loadInit() {
  const mod = await import('../src/init/index')
  return mod.init
}

interface Sandbox {
  root: string
  srcRoot: string
  outDir: string
  manifestPath: string
  lockfilePath: string
  config: PromptRegistryConfig
}

function makeSandbox(): Sandbox {
  const root = mkdtempSync(join(tmpdir(), 'promptregistry-init-'))
  const srcRoot = join(root, 'src')
  const outDir = join(root, 'prompts', '.generated')
  mkdirSync(srcRoot, { recursive: true })
  mkdirSync(outDir, { recursive: true })
  return {
    root,
    srcRoot,
    outDir,
    manifestPath: join(root, 'prompts', 'manifest.json'),
    // The lockfile must land in `outDir` — that's where `codegen`, `lock`, and
    // `check` all read it (join(outDir, 'prompt-lock.json')).
    lockfilePath: join(outDir, 'prompt-lock.json'),
    config: {
      manifestUrl: join(root, 'prompts', 'manifest.json'),
      srcRoots: [srcRoot],
      outDir,
    },
  }
}

describe('init', () => {
  let sb: Sandbox

  beforeEach(() => {
    sb = makeSandbox()
  })

  afterEach(() => {
    rmSync(sb.root, { recursive: true, force: true })
  })

  it('scaffolds a manifest with one entry from a single-prompt source file', async () => {
    writeFileSync(
      join(sb.srcRoot, 'greeting.ts'),
      `const greeting = prompt\`Hello {{name}}!\`\nexport { greeting }\n`,
    )

    const init = await loadInit()
    const result = await init(sb.config)

    expect(result.promptsFound).toBe(1)
    expect(existsSync(sb.manifestPath)).toBe(true)

    const manifest = JSON.parse(readFileSync(sb.manifestPath, 'utf-8'))
    expect(manifest.prompts).toHaveLength(1)
    expect(manifest.prompts[0].name).toBe('greeting')
    expect(manifest.prompts[0].template).toBe('Hello {{name}}!')
    expect(manifest.prompts[0].version).toBe('v1')
  })

  it('infers names per assignment target across multiple files', async () => {
    writeFileSync(
      join(sb.srcRoot, 'a.ts'),
      `const customerSummary = prompt\`Hi {{customerName}}\`\nexport { customerSummary }\n`,
    )
    writeFileSync(
      join(sb.srcRoot, 'b.ts'),
      `const welcomeMessage = prompt\`Welcome {{userName}}\`\nexport { welcomeMessage }\n`,
    )

    const init = await loadInit()
    const result = await init(sb.config)

    expect(result.promptsFound).toBe(2)
    const manifest = JSON.parse(readFileSync(sb.manifestPath, 'utf-8'))
    const names = manifest.prompts.map((p: { name: string }) => p.name).sort()
    expect(names).toEqual(['customerSummary', 'welcomeMessage'])
  })

  it('throws on duplicate inferred prompt names across files', async () => {
    writeFileSync(
      join(sb.srcRoot, 'a.ts'),
      `const greeting = prompt\`Hi {{name}}\`\nexport { greeting }\n`,
    )
    writeFileSync(
      join(sb.srcRoot, 'b.ts'),
      `const greeting = prompt\`Hello {{name}}\`\nexport { greeting }\n`,
    )

    const init = await loadInit()
    await expect(init(sb.config)).rejects.toThrow(/Duplicate prompt name inferred/)
  })

  it('writes a starter lockfile into outDir with one entry per prompt', async () => {
    writeFileSync(
      join(sb.srcRoot, 'a.ts'),
      `const a = prompt\`A {{x}}\`\nexport { a }\n`,
    )
    writeFileSync(
      join(sb.srcRoot, 'b.ts'),
      `const b = prompt\`B {{y}}\`\nexport { b }\n`,
    )

    const init = await loadInit()
    const result = await init(sb.config)

    expect(result.lockfilePath).toBe(sb.lockfilePath)
    expect(existsSync(sb.lockfilePath)).toBe(true)

    const lockfile = JSON.parse(readFileSync(sb.lockfilePath, 'utf-8'))
    expect(lockfile['lockfile-format-version']).toBe('1')
    expect(lockfile.entries).toHaveLength(2)
    for (const entry of lockfile.entries) {
      expect(entry).toMatchObject({
        version: 'v1',
        manifest_url: expect.stringMatching(/^file:\/\//),
      })
      expect(entry.content_hash).toMatch(/^[0-9a-f]{64}$/)
      expect(typeof entry.pulled_at).toBe('string')
    }
  })

  it('is idempotent for manifest.json across re-runs', async () => {
    writeFileSync(
      join(sb.srcRoot, 'one.ts'),
      `const one = prompt\`one {{x}}\`\nexport { one }\n`,
    )
    writeFileSync(
      join(sb.srcRoot, 'two.ts'),
      `const two = prompt\`two {{y}}\`\nexport { two }\n`,
    )

    const init = await loadInit()
    await init(sb.config)
    const first = readFileSync(sb.manifestPath)

    await init(sb.config)
    const second = readFileSync(sb.manifestPath)

    expect(first.equals(second)).toBe(true)
  })

  it('throws when no prompt() call-sites are found', async () => {
    writeFileSync(
      join(sb.srcRoot, 'unrelated.ts'),
      `export const x = 1\n`,
    )

    const init = await loadInit()
    await expect(init(sb.config)).rejects.toThrow(/No prompt\(\) call-sites found/)
  })

  it('writes the lockfile where check looks for it (no missing-lockfile after init)', async () => {
    // Regression: `init` used to write `prompt-lock.json` next to manifest.json
    // (dirname(manifestPath)), but `check`/`codegen`/`lock` read it from
    // `join(config.outDir, 'prompt-lock.json')`. With the default config those
    // are different directories, so `check` reported `missing-lockfile`
    // immediately after a successful `init`.
    writeFileSync(
      join(sb.srcRoot, 'greeting.ts'),
      `const greeting = prompt\`Hello {{name}}!\`\nexport { greeting }\n`,
    )

    const init = await loadInit()
    const result = await init(sb.config)

    // The lockfile must be in outDir, which is what check reads.
    expect(result.lockfilePath).toBe(join(sb.outDir, 'prompt-lock.json'))
    expect(existsSync(join(sb.outDir, 'prompt-lock.json'))).toBe(true)

    const { check } = await import('../src/check')
    const checkResult = await check(sb.config)

    // check must not report missing-lockfile after init.
    expect(checkResult.errors.some((e) => e.code === 'missing-lockfile')).toBe(false)
    // No generated .ts files yet, so the only signal is an orphaned-entry
    // warning — which does not fail the check.
    expect(checkResult.ok).toBe(true)
  })
})
