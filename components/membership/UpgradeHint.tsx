import Link from 'next/link'

import { Button } from '@/components/ui/button'

type UpgradeHintProps = {
  message: string
  className?: string
}

export function UpgradeHint({ message, className }: UpgradeHintProps) {
  return (
    <div className={className ?? 'flex items-center gap-2 text-sm text-muted-foreground'}>
      <span>{message}</span>
      <Button asChild variant="link" className="h-auto p-0 text-sm">
        <Link href="/pricing">Upgrade</Link>
      </Button>
    </div>
  )
}
