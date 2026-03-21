import { readFile } from 'node:fs/promises'
import path from 'node:path'

type LegalSource = {
  filename: string
  fallbackTitle: string
}

const ROOT_CANDIDATES = [
  process.cwd(),
  path.resolve(process.cwd(), '..'),
  path.resolve(process.cwd(), '../..'),
]

export async function readLegalDoc({
  filename,
  fallbackTitle,
}: LegalSource): Promise<{ title: string; content: string; lastUpdated: string | null }> {
  for (const root of ROOT_CANDIDATES) {
    const absolutePath = path.join(root, filename)

    try {
      const content = await readFile(absolutePath, 'utf8')
      const lines = content.split(/\r?\n/)
      const firstNonEmpty = lines.find((line) => line.trim().length > 0) ?? fallbackTitle
      const lastUpdatedLine = lines.find((line) => line.toLowerCase().startsWith('last updated:'))

      return {
        title: firstNonEmpty.trim(),
        content,
        lastUpdated: lastUpdatedLine?.replace(/last updated:/i, '').trim() ?? null,
      }
    } catch {
      // Try the next candidate root.
    }
  }

  throw new Error(`Unable to locate legal source file: ${filename}`)
}
