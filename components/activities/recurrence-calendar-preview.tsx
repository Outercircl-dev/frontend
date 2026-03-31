// Copyright (c) 2026 Outer Circle. All rights reserved.

'use client'

import { cn } from '@/lib/utils'
import type { RecurrenceWeekday } from '@/lib/types/activity'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type RecurrenceCalendarPreviewProps = {
  recurrenceEnabled: boolean
  activityDate: string
  frequency: 'daily' | 'weekly'
  occurrences: string
  weeklyDays: RecurrenceWeekday[]
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function weekdayFromDate(date: Date): RecurrenceWeekday {
  const index = date.getUTCDay()
  const byIndex: RecurrenceWeekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  return byIndex[index]
}

function normalizeToMondayFirst(weekday: RecurrenceWeekday): number {
  const order: RecurrenceWeekday[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]
  return order.indexOf(weekday)
}

function generateDates({
  activityDate,
  frequency,
  occurrences,
  weeklyDays,
}: {
  activityDate: string
  frequency: 'daily' | 'weekly'
  occurrences: number
  weeklyDays: RecurrenceWeekday[]
}): Date[] {
  const start = parseDateOnly(activityDate)
  if (frequency === 'daily') {
    return Array.from({ length: occurrences }, (_, index) => addDays(start, index))
  }

  const allowed = new Set(weeklyDays)
  const result: Date[] = []
  let cursor = new Date(start)
  while (result.length < occurrences) {
    if (allowed.has(weekdayFromDate(cursor))) {
      result.push(new Date(cursor))
    }
    cursor = addDays(cursor, 1)
  }
  return result
}

function formatMonthTitle(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function RecurrenceCalendarPreview({
  recurrenceEnabled,
  activityDate,
  frequency,
  occurrences,
  weeklyDays,
}: RecurrenceCalendarPreviewProps) {
  if (!recurrenceEnabled) {
    return null
  }

  if (!activityDate) {
    return <p className="text-xs text-muted-foreground">Select a start date to preview occurrences.</p>
  }

  const numericOccurrences = Number(occurrences)
  if (!numericOccurrences || numericOccurrences < 1) {
    return <p className="text-xs text-muted-foreground">Enter occurrences to display the calendar preview.</p>
  }

  const startWeekday = weekdayFromDate(parseDateOnly(activityDate))
  if (frequency === 'weekly' && weeklyDays.length === 0) {
    return <p className="text-xs text-destructive">Select at least one weekday for weekly recurrence.</p>
  }

  if (frequency === 'weekly' && !weeklyDays.includes(startWeekday)) {
    return (
      <p className="text-xs text-destructive">
        The selected weekdays must include the activity start date weekday.
      </p>
    )
  }

  const dates = generateDates({
    activityDate,
    frequency,
    occurrences: numericOccurrences,
    weeklyDays,
  })

  const monthKeys = Array.from(
    new Set(dates.map((date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`)),
  ).slice(0, 6)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Showing {dates.length} scheduled {dates.length === 1 ? 'event' : 'events'}.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {monthKeys.map((key) => {
          const [yearPart, monthPart] = key.split('-')
          const year = Number(yearPart)
          const month = Number(monthPart) - 1
          const first = new Date(Date.UTC(year, month, 1))
          const firstWeekday = (first.getUTCDay() + 6) % 7
          const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
          const activeDays = new Set(
            dates
              .filter((date) => date.getUTCFullYear() === year && date.getUTCMonth() === month)
              .map((date) => date.getUTCDate()),
          )

          const cells = []
          for (let index = 0; index < firstWeekday; index += 1) {
            cells.push(
              <div key={`pad-${key}-${index}`} className="h-8 rounded-md border border-transparent bg-transparent" />,
            )
          }
          for (let day = 1; day <= daysInMonth; day += 1) {
            const cellDate = new Date(Date.UTC(year, month, day))
            const weekday = weekdayFromDate(cellDate)
            cells.push(
              <div
                key={`${key}-${day}`}
                className={cn(
                  'flex h-8 items-center justify-center rounded-md border text-xs',
                  activeDays.has(day)
                    ? 'border-primary bg-primary/15 font-medium text-primary'
                    : 'border-border bg-background text-muted-foreground',
                  frequency === 'weekly' && weeklyDays.includes(weekday) && !activeDays.has(day)
                    ? 'border-dashed'
                    : null,
                )}
              >
                {day}
              </div>,
            )
          }

          return (
            <div key={key} className="rounded-md border bg-background p-3">
              <p className="mb-2 text-sm font-medium">{formatMonthTitle(year, month)}</p>
              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((weekday) => (
                  <div key={`${key}-${weekday}`} className="text-center text-[11px] text-muted-foreground">
                    {weekday}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">{cells}</div>
            </div>
          )
        })}
      </div>
      {monthKeys.length === 6 && dates.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">Preview is limited to the first 6 months.</p>
      ) : null}
    </div>
  )
}

export function weekdayLabel(weekday: RecurrenceWeekday): string {
  const labels: Record<RecurrenceWeekday, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  }
  return labels[weekday]
}

export function sortWeekdays(values: RecurrenceWeekday[]): RecurrenceWeekday[] {
  return [...values].sort((left, right) => normalizeToMondayFirst(left) - normalizeToMondayFirst(right))
}
