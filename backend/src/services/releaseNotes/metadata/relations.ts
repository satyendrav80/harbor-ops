/**
 * Relation definitions for Release Notes filter metadata
 */

import type { RelationMetadata } from '../../../types/filterMetadata';
import { formatFieldLabel } from '../../../utils/filterMetadataHelpers';

/**
 * Get all relations
 */
export function getRelations(): RelationMetadata[] {
  return [
    {
      name: 'service',
      type: 'one',
      label: formatFieldLabel('service'),
      model: 'Service',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'INT' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
        { key: 'port', label: formatFieldLabel('port'), type: 'INT' },
      ],
    },
    {
      name: 'createdByUser',
      type: 'one',
      label: formatFieldLabel('createdByUser'),
      model: 'User',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'STRING' },
        { key: 'email', label: formatFieldLabel('email'), type: 'STRING' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
      ],
    },
    {
      name: 'updatedByUser',
      type: 'one',
      label: formatFieldLabel('updatedByUser'),
      model: 'User',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'STRING' },
        { key: 'email', label: formatFieldLabel('email'), type: 'STRING' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
      ],
    },
  ];
}

