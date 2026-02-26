'use client'

import { openNotificationsDrawer } from '@/components/notifications/drawer-events'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <Card className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Notification preferences now open in the right-side drawer for faster access.
        </p>
        <Button type="button" variant="outline" onClick={openNotificationsDrawer}>
          Open notifications drawer
        </Button>
      </Card>
    </main>
  )
}

