/**
 * `promptregistry init` — scaffold manifest from existing prompt() call-sites.
 *
 * Lazy-loads `typescript` because it's the only place in the CLI that needs
 * the AST and we don't want to force every consumer to install it.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateManifest } from '../manifest/schema.js'
import type { PromptRegistryConfig } from '../cli/config.js'

export interface InitResult {
  manifestPath: string
  promptsFound: number
}

export async function init(config: PromptRegistryConfig): Promise<InitResult> {
  let ts: typeof import('typescript')
  try {
    ts = await import('typescript')
  } catch {
    throw new Error(
      "`promptregistry init` requires the optional peer dependency `typescript`. " +
      "Install it with: npm install --save-dev typescript",
    )
  }

  const prompts: Array<{ name: string; template: string; delimiter: { open: string; close: string } }> = []
  const seenNames = new Set<string>()

  for (const srcRoot of config.srcRoots) {
    if (!existsSync(srcRoot)) continue

    const files = ts.sys.readDirectory(srcRoot, ['.ts'], undefined, ['node_modules', 'dist'])
    for (const file of files) {
      const sourceFile = ts.createSourceFile(
        file,
        readFileSync(file, 'utf-8'),
        ts.ScriptTarget.Latest,
        true,
      )

      visitNode(ts, sourceFile, (node) => {
        if (ts.isTaggedTemplateExpression(node)) {
          const tagName = node.tag.getText(sourceFile)
          if (tagName === 'prompt') {
            const template = extractTemplateText(ts, node)
            if (template === null) return

            const name = inferPromptName(ts, node, sourceFile) ?? `prompt-${prompts.length + 1}`

            if (seenNames.has(name)) {
              throw new Error(`Duplicate prompt name inferred: "${name}" (in ${file})`)
            }
            seenNames.add(name)

            prompts.push({
              name,
              template,
              delimiter: { open: '{{', close: '}}' },
            })
          }
        }
      })
    }
  }

  if (prompts.length === 0) {
    throw new Error('No prompt() call-sites found in the scanned directories')
  }

  const manifest = {
    'manifest-format-version': '1' as const,
    prompts: prompts.map((p) => ({
      name: p.name,
      version: 'v1',
      template: p.template,
      delimiter: p.delimiter,
    })),
  }

  // Validate before writing
  validateManifest(manifest)

  const manifestPath = join(config.outDir, '..', 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

  return { manifestPath, promptsFound: prompts.length }
}

type Ts = typeof import('typescript')

function visitNode(ts: Ts, node: import('typescript').Node, callback: (node: import('typescript').Node) => void) {
  callback(node)
  ts.forEachChild(node, (child) => visitNode(ts, child, callback))
}

function extractTemplateText(
  ts: Ts,
  node: import('typescript').TaggedTemplateExpression,
): string | null {
  // Only support no-substitution template literals (no ${} expressions);
  // anything else can't be lifted to a static manifest entry.
  if (ts.isNoSubstitutionTemplateLiteral(node.template)) {
    return node.template.text
  }
  return null
}

function inferPromptName(
  ts: Ts,
  node: import('typescript').TaggedTemplateExpression,
  sourceFile: import('typescript').SourceFile,
): string | null {
  let current: import('typescript').Node = node
  while (current.parent) {
    if (ts.isVariableDeclaration(current.parent)) {
      return current.parent.name.getText(sourceFile)
    }
    current = current.parent
  }
  return null
}
