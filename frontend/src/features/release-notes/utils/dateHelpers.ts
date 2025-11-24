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

