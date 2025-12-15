import dayjs from './dayjs';

/**
 * Format a UTC ISO date string to local timezone for display
 * @param isoString - ISO date string (e.g., "2025-12-15T10:00:00.000Z")
 * @param format - dayjs format string (default: 'D MMM YYYY, HH:mm')
 * @returns Formatted date string in user's local timezone
 */
export function formatLocal(isoString: string | null | undefined, format: string = 'D MMM YYYY, HH:mm'): string {
  if (!isoString) return '-';
  return dayjs(isoString).format(format);
}

/**
 * Convert UTC ISO date string to datetime-local input value format
 * @param isoString - ISO date string (e.g., "2025-12-15T10:00:00.000Z")
 * @returns datetime-local format string (e.g., "2025-12-15T10:00")
 */
export function toDateTimeLocalValue(isoString: string | null | undefined): string {
  if (!isoString) return '';
  // dayjs parses ISO strings and formats in local timezone by default
  return dayjs(isoString).format('YYYY-MM-DDTHH:mm');
}

/**
 * Convert datetime-local input value to ISO string for backend
 * @param localValue - datetime-local format string (e.g., "2025-12-15T10:00")
 * @returns ISO string in UTC (e.g., "2025-12-15T10:00:00.000Z")
 */
export function fromDateTimeLocalValueToIso(localValue: string | null | undefined): string | null {
  if (!localValue) return null;
  // Parse as local time and convert to ISO (UTC)
  return dayjs(localValue).toISOString();
}

/**
 * Format date for detailed display (with seconds)
 */
export function formatLocalDetailed(isoString: string | null | undefined): string {
  return formatLocal(isoString, 'D/MM/YYYY, HH:mm:ss');
}

/**
 * Format date for short display (date only)
 */
export function formatLocalDate(isoString: string | null | undefined): string {
  return formatLocal(isoString, 'D MMM YYYY');
}

