import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AdSlotProps = {
  title?: string
  body?: string
  className?: string
}

export function AdSlot({
  title = 'Sponsored',
  body = 'Discover premium hosting perks and larger groups for your next event.',
  className,
}: AdSlotProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}
