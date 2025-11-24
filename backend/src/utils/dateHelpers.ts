/**
 * Date helper utilities for resolving special date values
 * Uses dayjs for consistent date handling
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with UTC and timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export type SpecialDateValue = 'now' | 'today' | 'yesterday' | 'tomorrow' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear';

export const SPECIAL_DATE_OPTIONS: { value: SpecialDateValue; label: string }[] = [
  { value: 'now', label: 'Now' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'thisWeek', label: 'This Week (start)' },
  { value: 'lastWeek', label: 'Last Week (start)' },
  { value: 'thisMonth', label: 'This Month (start)' },
  { value: 'lastMonth', label: 'Last Month (start)' },
  { value: 'thisYear', label: 'This Year (start)' },
  { value: 'lastYear', label: 'Last Year (start)' },
];

export function isSpecialDateValue(value: any): value is SpecialDateValue {
  return typeof value === 'string' && SPECIAL_DATE_OPTIONS.some(opt => opt.value === value);
}

/**
 * Convert dayjs object to JavaScript Date (for Prisma compatibility)
 */
function toDate(d: dayjs.Dayjs): Date {
  return d.toDate();
}

/**
 * Get start of day in UTC (for database comparisons)
 */
function startOfDay(date: Date | string | dayjs.Dayjs): Date {
  return toDate(dayjs.utc(date).startOf('day'));
}

/**
 * Get end of day in UTC (for database comparisons)
 */
function endOfDay(date: Date | string | dayjs.Dayjs): Date {
  return toDate(dayjs.utc(date).endOf('day'));
}

/**
 * Get start of week in UTC
 */
function startOfWeek(date: Date | string | dayjs.Dayjs, weekStartsOn: number = 1): Date {
  const d = dayjs.utc(date);
  // dayjs uses 0=Sunday, 1=Monday, etc.
  // weekStartsOn: 0=Sunday, 1=Monday
  const day = d.day();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  return toDate(d.subtract(diff, 'day').startOf('day'));
}

/**
 * Get start of month in UTC
 */
function startOfMonth(date: Date | string | dayjs.Dayjs): Date {
  return toDate(dayjs.utc(date).startOf('month'));
}

/**
 * Get start of year in UTC
 */
function startOfYear(date: Date | string | dayjs.Dayjs): Date {
  return toDate(dayjs.utc(date).startOf('year'));
}

export function resolveSpecialDateValue(value: string | Date): Date {
  if (value instanceof Date) {
    // Convert existing Date to UTC start of day for consistency
    return startOfDay(value);
  }

  const now = dayjs.utc();
  
  switch (value as SpecialDateValue) {
    case 'now':
      return now.toDate();
    case 'today':
      return startOfDay(now);
    case 'yesterday':
      return startOfDay(now.subtract(1, 'day'));
    case 'tomorrow':
      return startOfDay(now.add(1, 'day'));
    case 'thisWeek':
      return startOfWeek(now, 1); // Monday as start of week
    case 'lastWeek':
      return startOfWeek(now.subtract(1, 'week'), 1);
    case 'thisMonth':
      return startOfMonth(now);
    case 'lastMonth':
      return startOfMonth(now.subtract(1, 'month'));
    case 'thisYear':
      return startOfYear(now);
    case 'lastYear':
      return startOfYear(now.subtract(1, 'year'));
    default:
      // If not a special value, assume it's a regular date string
      // Parse as UTC to match database storage
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        // Parse YYYY-MM-DD format as UTC (database stores in UTC)
        return dayjs.utc(value).startOf('day').toDate();
      }
      // For other date strings, parse as UTC
      return dayjs.utc(value).toDate();
  }
}

/**
 * Normalize a date value based on the operator type
 * - Start operators (gte, gt): normalize to start of day (00:00:00.000)
 * - End operators (lte, lt): normalize to end of day (23:59:59.999)
 * - For 'between', the start value should be normalized to start of day, end to end of day
 * 
 * @param date - The date to normalize
 * @param operator - The filter operator
 * @param isEndValue - Whether this is the end value in a 'between' operator
 * @returns Normalized date
 */
export function normalizeDateForOperator(
  date: Date | string,
  operator: string,
  isEndValue: boolean = false
): Date {
  // Parse date as UTC (database stores dates in UTC)
  // This ensures consistent comparisons regardless of server timezone
  let dateObj: dayjs.Dayjs;
  if (date instanceof Date) {
    dateObj = dayjs.utc(date);
  } else if (typeof date === 'string') {
    // Parse date string as UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // YYYY-MM-DD format - parse as UTC
      dateObj = dayjs.utc(date);
    } else {
      // Other formats - parse as UTC
      dateObj = dayjs.utc(date);
    }
  } else {
    dateObj = dayjs.utc(date);
  }
  
  // For 'between' operator, normalize based on isEndValue
  if (operator === 'between') {
    return isEndValue ? endOfDay(dateObj) : startOfDay(dateObj);
  }
  
  // For "greater than or equal" - normalize to start of day (includes the entire day)
  if (operator === 'gte') {
    return startOfDay(dateObj);
  }
  
  // For "greater than" - normalize to end of day (means after the day ends)
  if (operator === 'gt') {
    return endOfDay(dateObj);
  }
  
  // For "less than or equal" - normalize to end of day (includes the entire day)
  if (operator === 'lte') {
    return endOfDay(dateObj);
  }
  
  // For "less than" - normalize to start of day (means before the day starts)
  if (operator === 'lt') {
    return startOfDay(dateObj);
  }
  
  // For equality, normalize to start of day for consistency
  if (operator === 'eq') {
    return startOfDay(dateObj);
  }
  
  // For other operators, return as UTC date
  return dateObj.toDate();
}

/**
 * Check if a field is a date/datetime field based on field name or type
 */
export function isDateField(fieldName: string, fieldType?: string): boolean {
  // Check by field name patterns
  if (fieldName.includes('Date') || fieldName.includes('At')) {
    return true;
  }
  
  // Check by type
  if (fieldType === 'DATE' || fieldType === 'DATETIME') {
    return true;
  }
  
  return false;
}

