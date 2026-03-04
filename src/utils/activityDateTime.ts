function toActivityStartDate(activityDate: string, startTime: string): Date | null {
  const date = new Date(activityDate)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const [hours, minutes, seconds = '0'] = startTime.split(':')
  const parsedHours = Number.parseInt(hours, 10)
  const parsedMinutes = Number.parseInt(minutes, 10)
  const parsedSeconds = Number.parseInt(seconds, 10)
  if (
    Number.isNaN(parsedHours) ||
    Number.isNaN(parsedMinutes) ||
    Number.isNaN(parsedSeconds)
  ) {
    return null
  }

  date.setHours(parsedHours, parsedMinutes, parsedSeconds, 0)
  return date
}

export function hasActivityStarted(activityDate: string, startTime: string): boolean {
  const start = toActivityStartDate(activityDate, startTime)
  if (!start) return false
  return start.getTime() <= Date.now()
}
