/**
 * Time utility functions for OuterCircl
 * Provides human-readable time formatting for activity feeds and timestamps.
 *
 * @module utils/time
 * @see SRS F2 - Personalized Datafeed (time display)
 */

/**
 * Time unit thresholds in milliseconds
 */
const TIME_UNITS = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Formats a timestamp into a human-readable relative time string.
 *
 * Converts timestamps to friendly formats like "2 minutes ago" for past times
 * or "in 3 hours" for future times. Useful for displaying activity timestamps
 * in feeds and notifications.
 *
 * @param timestamp - The date to format relative to now
 * @returns A human-readable string representing the relative time
 *
 * @example
 * // Past timestamps
 * formatTimeAgo(new Date(Date.now() - 30000))    // "30 seconds ago"
 * formatTimeAgo(new Date(Date.now() - 60000))    // "1 minute ago"
 * formatTimeAgo(new Date(Date.now() - 3600000))  // "1 hour ago"
 * formatTimeAgo(new Date(Date.now() - 86400000)) // "1 day ago"
 *
 * @example
 * // Future timestamps
 * formatTimeAgo(new Date(Date.now() + 300000))   // "in 5 minutes"
 * formatTimeAgo(new Date(Date.now() + 7200000))  // "in 2 hours"
 *
 * @example
 * // Edge cases
 * formatTimeAgo(new Date())                      // "just now"
 */
export function formatTimeAgo(timestamp: Date): string {
  const now = Date.now();
  const time = timestamp.getTime();
  const diff = now - time;
  const absDiff = Math.abs(diff);

  // Determine if the timestamp is in the past or future
  const isFuture = diff < 0;

  // Handle "just now" case (within 10 seconds)
  if (absDiff < 10 * TIME_UNITS.second) {
    return 'just now';
  }

  // Calculate the appropriate unit and value
  let value: number;
  let unit: string;

  if (absDiff < TIME_UNITS.minute) {
    value = Math.floor(absDiff / TIME_UNITS.second);
    unit = 'second';
  } else if (absDiff < TIME_UNITS.hour) {
    value = Math.floor(absDiff / TIME_UNITS.minute);
    unit = 'minute';
  } else if (absDiff < TIME_UNITS.day) {
    value = Math.floor(absDiff / TIME_UNITS.hour);
    unit = 'hour';
  } else if (absDiff < TIME_UNITS.week) {
    value = Math.floor(absDiff / TIME_UNITS.day);
    unit = 'day';
  } else if (absDiff < TIME_UNITS.month) {
    value = Math.floor(absDiff / TIME_UNITS.week);
    unit = 'week';
  } else if (absDiff < TIME_UNITS.year) {
    value = Math.floor(absDiff / TIME_UNITS.month);
    unit = 'month';
  } else {
    value = Math.floor(absDiff / TIME_UNITS.year);
    unit = 'year';
  }

  // Pluralize the unit if needed
  const pluralizedUnit = value === 1 ? unit : `${unit}s`;

  // Return formatted string based on past/future
  if (isFuture) {
    return `in ${value} ${pluralizedUnit}`;
  }

  return `${value} ${pluralizedUnit} ago`;
}

