/**
 * Field definitions for Release Notes filter metadata
 */

import type { FilterFieldMetadata } from '../../../types/filterMetadata';
import {
  getOperatorsForType,
  getDefaultUIConfig,
  formatFieldLabel,
  isFieldSearchable,
  isFieldSortable,
} from '../../../utils/filterMetadataHelpers';

/**
 * Get all filterable fields
 */
export function getFields(): FilterFieldMetadata[] {
  return [
    // ID field
    {
      key: 'id',
      label: formatFieldLabel('id'),
      type: 'INT',
      operators: getOperatorsForType('INT', false),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('id', 'INT'),
      sortable: isFieldSortable('INT'),
      ui: getDefaultUIConfig('INT', 'id'),
    },
    // Status field (enum)
    {
      key: 'status',
      label: formatFieldLabel('status'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op => 
        ['eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('status', 'STRING'),
      sortable: isFieldSortable('STRING'),
      enumValues: ['pending', 'deployment_started', 'deployed'],
      ui: getDefaultUIConfig('STRING', 'status', true, ['pending', 'deployment_started', 'deployed']),
    },
    // Note field (searchable text)
    {
      key: 'note',
      label: formatFieldLabel('note'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('note', 'STRING'),
      sortable: isFieldSortable('STRING'),
      ui: {
        ...getDefaultUIConfig('STRING', 'note'),
        placeholder: 'Search in notes...',
      },
    },
    // Publish Date
    {
      key: 'publishDate',
      label: formatFieldLabel('publishDate'),
      type: 'DATETIME',
      operators: getOperatorsForType('DATETIME', true),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('publishDate', 'DATETIME'),
      sortable: isFieldSortable('DATETIME'),
      ui: getDefaultUIConfig('DATETIME', 'publishDate'),
    },
    // Created Date
    {
      key: 'createdAt',
      label: formatFieldLabel('createdAt'),
      type: 'DATETIME',
      operators: getOperatorsForType('DATETIME', true),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('createdAt', 'DATETIME'),
      sortable: isFieldSortable('DATETIME'),
      ui: getDefaultUIConfig('DATETIME', 'createdAt'),
    },
    // Updated Date
    {
      key: 'updatedAt',
      label: formatFieldLabel('updatedAt'),
      type: 'DATETIME',
      operators: getOperatorsForType('DATETIME', true),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('updatedAt', 'DATETIME'),
      sortable: isFieldSortable('DATETIME'),
      ui: getDefaultUIConfig('DATETIME', 'updatedAt'),
    },
    // Service ID (direct foreign key) - configured for service dropdown
    {
      key: 'serviceId',
      label: formatFieldLabel('serviceId'),
      type: 'INT',
      operators: getOperatorsForType('INT', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('serviceId', 'INT'),
      sortable: isFieldSortable('INT'),
      relationModel: 'Service', // Indicates this field should use Service dropdown
      relationField: 'name', // Field to display in dropdown
      ui: getDefaultUIConfig('INT', 'serviceId'),
    },
    // Service Name (relation field) - use dot notation for key
    // Supports both dropdown (in/notIn) and text input (contains, etc.)
    {
      key: 'service.name',
      label: `Service - ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false),
      relation: 'service',
      relationType: 'one',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      relationModel: 'Service', // Indicates this field can use Service dropdown for in/notIn
      relationField: 'name', // Field to display in dropdown
      ui: getDefaultUIConfig('STRING', 'service name'),
    },
    // Service Port (relation field) - use dot notation for key
    {
      key: 'service.port',
      label: `Service - ${formatFieldLabel('port')}`,
      type: 'INT',
      operators: getOperatorsForType('INT', false),
      relation: 'service',
      relationType: 'one',
      searchable: isFieldSearchable('port', 'INT'),
      sortable: isFieldSortable('INT', 'one'),
      ui: getDefaultUIConfig('INT', 'port'),
    },
    // Created By User ID
    {
      key: 'createdBy',
      label: formatFieldLabel('createdBy'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('createdBy', 'STRING'),
      sortable: isFieldSortable('STRING'),
      ui: getDefaultUIConfig('STRING', 'createdBy'),
    },
    // Created By User Email (relation field) - use dot notation for key
    {
      key: 'createdByUser.email',
      label: `Created By - ${formatFieldLabel('email')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['eq', 'ne', 'contains', 'startsWith', 'endsWith'].includes(op)
      ),
      relation: 'createdByUser',
      relationType: 'one',
      searchable: isFieldSearchable('email', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      ui: getDefaultUIConfig('STRING', 'email'),
    },
    // Created By User Name (relation field) - use dot notation for key
    {
      key: 'createdByUser.name',
      label: `Created By - ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne'].includes(op)
      ),
      relation: 'createdByUser',
      relationType: 'one',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      ui: getDefaultUIConfig('STRING', 'name'),
    },
  ];
}

