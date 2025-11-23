/**
 * Date helper utilities for resolving special date values
 */

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

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfWeek(date: Date, weekStartsOn: number = 1): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  result.setDate(result.getDate() - diff);
  return startOfDay(result);
}

function startOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfDay(result);
}

function startOfYear(date: Date): Date {
  const result = new Date(date.getFullYear(), 0, 1);
  return startOfDay(result);
}

export function resolveSpecialDateValue(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  const now = new Date();
  switch (value as SpecialDateValue) {
    case 'now':
      return now;
    case 'today':
      return startOfDay(now);
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return startOfDay(yesterday);
    }
    case 'tomorrow': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return startOfDay(tomorrow);
    }
    case 'thisWeek':
      return startOfWeek(now, 1); // Monday as start of week
    case 'lastWeek': {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return startOfWeek(lastWeek, 1);
    }
    case 'thisMonth':
      return startOfMonth(now);
    case 'lastMonth': {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return startOfMonth(lastMonth);
    }
    case 'thisYear':
      return startOfYear(now);
    case 'lastYear': {
      const lastYear = new Date(now);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return startOfYear(lastYear);
    }
    default:
      // If not a special value, assume it's a regular date string
      return new Date(value);
  }
}

