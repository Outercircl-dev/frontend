// Copyright (c) 2026 Outer Circle. All rights reserved.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { ProtectedHeader } from '@/components/layout/ProtectedHeader'
import { BrowserNotificationPrompt } from '@/components/notifications/BrowserNotificationPrompt'
import { NotificationPreferencesSection } from '@/components/notifications/NotificationPreferencesSection'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useNotifications } from '@/hooks/useNotifications'

export default function SettingsPage() {
  const router = useRouter()
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const { permission, requestPermission } = useNotifications()

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) {
      return
    }
    const confirmed = window.confirm(
      'Delete your account permanently? This cannot be undone.',
    )
    if (!confirmed) {
      return
    }
    try {
      setIsDeletingAccount(true)
      const response = await fetch('/rpc/v1/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        throw new Error('Failed to delete account')
      }
      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert('Unable to delete account right now. Please try again.')
    } finally {
      setIsDeletingAccount(false)
    }
  }

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
        <NotificationPreferencesSection idPrefix="settings-pref" />
        <Card className="space-y-3 p-4">
          <p className="text-sm font-medium">Browser notifications</p>
          <BrowserNotificationPrompt permission={permission} onRequestPermission={requestPermission} />
        </Card>
        <Card className="space-y-3 border-destructive/40 p-4">
          <p className="text-sm font-medium text-destructive">Delete account</p>
          <p className="text-sm text-muted-foreground">
            Permanently remove your account and associated activity data.
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDeleteAccount()}
            disabled={isDeletingAccount}
            className="w-full sm:w-auto"
          >
            {isDeletingAccount ? 'Deleting account...' : 'Delete account'}
          </Button>
        </Card>
      </main>
    </div>
  )
}

