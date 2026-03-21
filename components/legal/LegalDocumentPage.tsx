type LegalDocumentPageProps = {
  heading: string
  title: string
  lastUpdated?: string | null
  content: string
}

function renderLegalContent(content: string) {
  const lines = content.split(/\r?\n/)
  const blocks: Array<{ type: 'paragraph' | 'list'; lines: string[] }> = []
  let current: { type: 'paragraph' | 'list'; lines: string[] } | null = null

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const isBullet = line.trim().startsWith('* ')
    const isEmpty = line.trim().length === 0

    if (isEmpty) {
      if (current && current.lines.length > 0) {
        blocks.push(current)
      }
      current = null
      continue
    }

    const nextType = isBullet ? 'list' : 'paragraph'
    if (!current || current.type !== nextType) {
      if (current && current.lines.length > 0) {
        blocks.push(current)
      }
      current = { type: nextType, lines: [] }
    }

    current.lines.push(line)
  }

  if (current && current.lines.length > 0) {
    blocks.push(current)
  }

  return blocks.map((block, index) => {
    if (block.type === 'list') {
      return (
        <ul key={`list-${index}`} className="list-disc space-y-2 pl-6 text-sm leading-7 text-foreground/90">
          {block.lines.map((line, lineIndex) => (
            <li key={`li-${index}-${lineIndex}`}>{line.replace(/^\*\s+/, '')}</li>
          ))}
        </ul>
      )
    }

    const text = block.lines.join(' ').trim()
    const isHeading =
      /^(\d+(\.\d+)*)\.\s/.test(text) ||
      (text.toUpperCase() === text && text.length < 100 && /[A-Z]/.test(text))

    if (isHeading) {
      return (
        <h2 key={`h2-${index}`} className="pt-2 text-lg font-semibold tracking-tight text-foreground">
          {text}
        </h2>
      )
    }

    return (
      <p key={`p-${index}`} className="text-sm leading-7 text-muted-foreground">
        {text}
      </p>
    )
  })
}

export function LegalDocumentPage({ heading, title, lastUpdated, content }: LegalDocumentPageProps) {
  return (
    <main className="bg-background">
      <section className="border-b border-border/70 bg-linear-to-b from-primary/10 via-primary/5 to-transparent px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-4xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{heading}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          {lastUpdated ? (
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          ) : null}
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <article className="mx-auto w-full max-w-4xl rounded-2xl border border-border/80 bg-card px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <div className="space-y-4">{renderLegalContent(content)}</div>
        </article>
      </section>
    </main>
  )
}
