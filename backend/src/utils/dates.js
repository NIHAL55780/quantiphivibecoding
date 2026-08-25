const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Converts a YYYY-MM-DD string to its UTC midnight timestamp.
 *
 * Anchoring every date to UTC midnight is what makes day arithmetic exact:
 * subtracting two such timestamps always yields a whole number of days, so a
 * renewal seven days out is never rounded down to six by a stray few hours.
 */
export function parseDateOnly(dateString) {
  if (typeof dateString !== 'string' || !DATE_ONLY_PATTERN.test(dateString)) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  // Rejects calendar-invalid values such as 2026-02-31, which Date.UTC would
  // otherwise silently roll forward into March.
  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  return isRealDate ? timestamp : null;
}

export function isValidDateOnly(dateString) {
  return parseDateOnly(dateString) !== null;
}

/**
 * Today's calendar date, as a YYYY-MM-DD string.
 *
 * Uses the server's local calendar day rather than the UTC day so that "renews
 * today" matches what the user sees on their own calendar.
 */
export function getToday(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Whole calendar days from `fromDate` to `toDate`.
 * Negative when `toDate` is in the past, zero when the dates are the same day.
 */
export function differenceInDays(fromDate, toDate) {
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);

  if (from === null || to === null) {
    return null;
  }

  return Math.round((to - from) / MILLISECONDS_PER_DAY);
}
