/**
 * Types for Advanced Filters Panel
 */

import type { FilterFieldMetadata } from '../../types/filters';
import type { ConditionType } from '../../types/filters';

export type FilterRow = {
  id: string;
  fieldKey: string;
  operator: string;
  value: any;
  fieldMetadata?: FilterFieldMetadata;
};

export type ConditionGroupState = {
  id: string;
  condition: ConditionType;
  rows: FilterRow[];
  groups: ConditionGroupState[]; // Nested groups
};
