'use client'

import { openNotificationsDrawer } from '@/components/notifications/drawer-events'
import { ProtectedHeader } from '@/components/layout/ProtectedHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <ProtectedHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your in-app and email notification preferences from one place.
          </p>
        </div>
        <Card className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            Notification preferences open in the right-side drawer for faster access.
          </p>
          <Button type="button" variant="outline" onClick={openNotificationsDrawer}>
            Open notifications drawer
          </Button>
        </Card>
      </main>
    </div>
  )
}

