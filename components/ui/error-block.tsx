import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ErrorBlockProps = {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorBlock({ title = 'Something went wrong', message, onRetry }: ErrorBlockProps) {
  return (
    <Card className="border-red-200/80 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-red-700/90">
        <p className="rounded-md bg-white/70 p-3">{message}</p>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
