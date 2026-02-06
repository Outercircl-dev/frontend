import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AdSlotProps = {
  title?: string
  body?: string
  ctaLabel?: string
  className?: string
}

export function AdSlot({
  title = 'Sponsored',
  body = 'Discover premium hosting perks and larger groups for your next event.',
  ctaLabel = 'Learn more',
  className,
}: AdSlotProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">{body}</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/pricing">{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
