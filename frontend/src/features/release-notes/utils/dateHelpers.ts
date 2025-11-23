/**
 * Date helper utilities for special date values
 */

export type SpecialDateValue = 
  | 'now'
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear';

export const SPECIAL_DATE_OPTIONS: Array<{ value: SpecialDateValue; label: string }> = [
  { value: 'now', label: 'Now' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
];

/**
 * Check if a value is a special date value
 */
export function isSpecialDateValue(value: any): value is SpecialDateValue {
  return typeof value === 'string' && SPECIAL_DATE_OPTIONS.some(opt => opt.value === value);
}

/**
 * Convert special date value to actual date string (for display purposes)
 * This is used in the UI to show what the special value represents
 */
export function getSpecialDateDisplay(value: SpecialDateValue): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (value) {
    case 'now':
      return now.toLocaleString();
    case 'today':
      return today.toISOString().split('T')[0];
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    case 'thisWeek':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return `${weekStart.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`;
    case 'lastWeek':
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      return `${lastWeekStart.toISOString().split('T')[0]} to ${lastWeekEnd.toISOString().split('T')[0]}`;
    case 'thisMonth':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return `${monthStart.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`;
    case 'lastMonth':
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return `${lastMonth.toISOString().split('T')[0]} to ${lastMonthEnd.toISOString().split('T')[0]}`;
    case 'thisYear':
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return `${yearStart.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`;
    case 'lastYear':
      const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
      return `${lastYearStart.toISOString().split('T')[0]} to ${lastYearEnd.toISOString().split('T')[0]}`;
    default:
      return value;
  }
}

