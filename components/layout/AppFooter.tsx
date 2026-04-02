import Link from 'next/link'

export function AppFooter() {
  return (
    <footer className="border-t bg-background/95">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
        <span>&copy; 2026 outercircl</span>
        <div className="flex items-center gap-3">
          <Link href="/about" className="hover:text-foreground">
            Our Story
          </Link>
          <Link href="/privacy-policy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms-and-conditions" className="hover:text-foreground">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  )
}

