import { Effect, DateTime, Context } from 'effect'

/**
 * Datetime utility functions for handling UTC and user time zones
 */

/**
 * Get the current datetime in UTC format
 */
export const getNowUtc = DateTime.now

/**
 * Get the current datetime in a specified time zone
 *
 * @param timeZone - The time zone to use
 * @returns - Current datetime in the specified time zone
 */
export const getNowInTimeZone = (timeZone: string): Effect.Effect<DateTime.Zoned, never, never> =>
  Effect.gen(function* () {
    // Get current UTC time
    const nowUtc = yield* DateTime.now

    try {
      // Try to set specified time zone
      return DateTime.unsafeSetZoneNamed(nowUtc, timeZone)
    } catch (error) {
      // If time zone is invalid, use UTC as fallback
      console.warn(`Invalid time zone: ${timeZone}, using UTC instead`)
      return DateTime.unsafeSetZoneNamed(nowUtc, 'UTC')
    }
  })

/**
 * Format a datetime in ISO format with time zone information
 *
 * @param datetime - The datetime to format
 * @returns - Formatted datetime string
 */
export const formatDateTimeIso = (datetime: DateTime.DateTime): string => {
  if (DateTime.isZoned(datetime)) {
    return DateTime.formatIsoZoned(datetime)
  }
  return DateTime.formatIso(datetime)
}

/**
 * Format a datetime in a user-friendly format
 *
 * @param datetime - The datetime to format
 * @param options - Formatting options
 * @returns - Formatted datetime string
 */
export const formatDateTime = (
  datetime: DateTime.DateTime,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short'
  }
): string => {
  return DateTime.format(datetime, options)
}

/**
 * Calculate the time difference between now and a given datetime
 *
 * @param datetime - The datetime to compare with now
 * @returns - The time difference in milliseconds
 */
export const timeSince = (datetime: DateTime.DateTime): Effect.Effect<number, never, never> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now
    return DateTime.distance(datetime, now)
  })
