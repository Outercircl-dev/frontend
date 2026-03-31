'use client'

import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useNotifications } from '@/hooks/useNotifications'

type PreferenceField =
  | 'recommendedActivities'
  | 'upcomingActivityReminders'
  | 'hostJoinCancelUpdates'
  | 'timeLocationChangeAlerts'
  | 'safetyAlerts'
  | 'channelInApp'
  | 'channelEmail'
  | 'channelBrowser'

const preferenceFields: Array<{ key: PreferenceField; label: string }> = [
  { key: 'recommendedActivities', label: 'Recommended activity matches' },
  { key: 'upcomingActivityReminders', label: 'Upcoming activity reminders' },
  { key: 'hostJoinCancelUpdates', label: 'Participation and activity updates' },
  { key: 'timeLocationChangeAlerts', label: 'Time/location change alerts' },
  { key: 'safetyAlerts', label: 'Safety alerts' },
  { key: 'channelInApp', label: 'In-app notifications' },
  { key: 'channelEmail', label: 'Email notifications' },
  { key: 'channelBrowser', label: 'Browser notifications' },
]

export function NotificationPreferencesSection({ idPrefix }: { idPrefix: string }) {
  const { preferences, isSavingPreferences, updatePreferences } = useNotifications()

  const togglePreference = async (key: PreferenceField, value: boolean) => {
    await updatePreferences({ [key]: value })
  }

  return (
    <Card className="space-y-3 p-3">
      <p className="text-sm font-medium">Preferences</p>
      {preferences
        ? preferenceFields.map((field) => (
            <div key={field.key} className="flex items-center justify-between gap-3">
              <Label htmlFor={`${idPrefix}-${field.key}`} className="pr-3 text-sm leading-snug">
                {field.label}
              </Label>
              <Checkbox
                id={`${idPrefix}-${field.key}`}
                checked={Boolean(preferences[field.key])}
                disabled={isSavingPreferences}
                onCheckedChange={(checked) => void togglePreference(field.key, checked === true)}
              />
            </div>
          ))
        : <p className="text-sm text-muted-foreground">Loading preferences...</p>}
    </Card>
  )
}

