const ADDRESS_PATTERN = /^(?=.*[A-Za-z])[A-Za-z0-9\s,.'#/-]+$/;

function isValidIanaTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeTimeString(timeString: string): string {
  const [hours, minutes, seconds = '00'] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
}

function getCurrentDateTimeInTimezone(timezone: string): { date: string; time: string } {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  return { date, time };
}

export function getCurrentDateInTimezone(timezone: string): string {
  return getCurrentDateTimeInTimezone(timezone).date;
}

export function resolveClientTimezone(): string {
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return detectedTimezone && isValidIanaTimezone(detectedTimezone) ? detectedTimezone : 'UTC';
}

export function validateActivityCreationInput(input: {
  address: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
}): string | null {
  const trimmedAddress = input.address.trim();
  if (trimmedAddress.length < 5 || trimmedAddress.length > 160 || !ADDRESS_PATTERN.test(trimmedAddress)) {
    return 'Enter a valid location address using standard address characters.';
  }

  const normalizedStartTime = normalizeTimeString(input.startTime);
  const normalizedEndTime = normalizeTimeString(input.endTime);
  if (normalizedEndTime <= normalizedStartTime) {
    return 'End time must be after start time.';
  }

  if (!isValidIanaTimezone(input.timezone)) {
    return 'Could not determine your timezone. Please refresh and try again.';
  }

  const nowInTimezone = getCurrentDateTimeInTimezone(input.timezone);
  if (
    input.activityDate < nowInTimezone.date ||
    (input.activityDate === nowInTimezone.date && normalizedStartTime <= nowInTimezone.time)
  ) {
    return 'Activity start date/time must be in the future.';
  }

  return null;
}
