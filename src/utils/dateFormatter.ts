/**
 * Date and Time Formatter Utility for SEC CSE-17 Fund Tracker
 * Formats timestamps strictly as "YYYY-MM-DD HH:MM:SS" (e.g., "2026-11-04 10:25:30")
 */

/**
 * Returns current date and time formatted as "YYYY-MM-DD HH:MM:SS"
 */
export function getCurrentDateTimeString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats any payment date string, Date object, or legacy receipt into "YYYY-MM-DD HH:MM:SS"
 *
 * @param paymentDate - Date string or timestamp
 * @param receiptId - Optional receipt ID (e.g., r_1730700000000) to extract creation time for legacy records
 */
export function formatPaymentDateTime(paymentDate?: string | null, receiptId?: string): string {
  if (!paymentDate) return getCurrentDateTimeString();
  const trimmed = String(paymentDate).trim();

  // Already in "YYYY-MM-DD HH:MM:SS" format
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // ISO 8601 string with 'T' (e.g. 2026-11-04T10:25:30.000Z)
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return getCurrentDateTimeString(d);
    }
  }

  // Date-only format "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // Try to extract actual historical creation time from receipt ID if available (e.g., r_1730700000000)
    if (receiptId && receiptId.startsWith('r_')) {
      const tsStr = receiptId.replace(/^r_/, '').split('_')[0];
      const rawTs = parseInt(tsStr, 10);
      if (!isNaN(rawTs) && rawTs > 1600000000000) {
        const d = new Date(rawTs);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${trimmed} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
    }
    // Default fallback time for pure date-only records
    return `${trimmed} 12:00:00`;
  }

  // General Date parseable format
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return getCurrentDateTimeString(parsed);
  }

  return trimmed;
}
