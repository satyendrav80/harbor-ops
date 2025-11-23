/**
 * Filter Metadata Service
 * 
 * This index file exports the metadata functions.
 * All sub-functions are implemented in their own module files.
 */

import type { FilterMetadata } from '../../../types/filterMetadata';
import { getAllSupportedOperators } from '../../../utils/filterMetadataHelpers';
import { getFields } from './fields';
import { getRelations } from './relations';

/**
 * Get filter metadata for Credentials
 */
export function getFilterMetadata(): FilterMetadata {
  const fields = getFields();
  const relations = getRelations();
  const supportedOperators = getAllSupportedOperators();

  return {
    fields,
    relations,
    defaultSort: {
      key: 'createdAt',
      direction: 'desc',
    },
    supportedOperators,
  };
}

