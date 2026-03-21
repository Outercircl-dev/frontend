type UpgradeHintProps = {
  message: string
  className?: string
}

export function UpgradeHint({ message, className }: UpgradeHintProps) {
  return (
    <div className={className ?? 'flex items-center gap-2 text-sm text-muted-foreground'}>
      <span>{message}</span>
    </div>
  )
}
