/**
 * Field definitions for Services filter metadata
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
    // Name field
    {
      key: 'name',
      label: formatFieldLabel('name'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: isFieldSortable('STRING'),
      ui: {
        ...getDefaultUIConfig('STRING', 'name'),
        placeholder: 'Search in name...',
      },
    },
    // Port field
    {
      key: 'port',
      label: formatFieldLabel('port'),
      type: 'INT',
      operators: getOperatorsForType('INT', false),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('port', 'INT'),
      sortable: isFieldSortable('INT'),
      ui: getDefaultUIConfig('INT', 'port'),
    },
    // External field (boolean)
    {
      key: 'external',
      label: formatFieldLabel('external'),
      type: 'BOOLEAN',
      operators: ['eq', 'ne'],
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('external', 'BOOLEAN'),
      sortable: isFieldSortable('BOOLEAN'),
      enumValues: ['true', 'false'],
      ui: getDefaultUIConfig('BOOLEAN', 'external', true, ['true', 'false']),
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
    // Created By User Email (relation field)
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
    // Created By User Name (relation field)
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
    // Server ID (many-to-many relation)
    {
      key: 'servers.id',
      label: `Server - ${formatFieldLabel('id')}`,
      type: 'INT',
      operators: getOperatorsForType('INT', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: 'servers',
      relationType: 'many',
      searchable: isFieldSearchable('id', 'INT'),
      sortable: false,
      relationModel: 'Server',
      relationField: 'name',
      ui: getDefaultUIConfig('INT', 'serverId'),
    },
    // Server Name (many-to-many relation)
    {
      key: 'servers.name',
      label: `Server - ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: 'servers',
      relationType: 'many',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: false,
      relationModel: 'Server',
      relationField: 'name',
      ui: getDefaultUIConfig('STRING', 'server name'),
    },
    // Tag ID (many-to-many relation)
    {
      key: 'tags.id',
      label: `Tag - ${formatFieldLabel('id')}`,
      type: 'INT',
      operators: getOperatorsForType('INT', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: 'tags',
      relationType: 'many',
      searchable: isFieldSearchable('id', 'INT'),
      sortable: false,
      relationModel: 'Tag',
      relationField: 'name',
      ui: getDefaultUIConfig('INT', 'tagId'),
    },
    // Tag Name (many-to-many relation)
    {
      key: 'tags.name',
      label: `Tag - ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: 'tags',
      relationType: 'many',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: false,
      relationModel: 'Tag',
      relationField: 'name',
      ui: getDefaultUIConfig('STRING', 'tag name'),
    },
    // Dependency Service ID (one-to-many relation)
    {
      key: 'dependencies.dependencyServiceId',
      label: `Dependency - Service ${formatFieldLabel('id')}`,
      type: 'INT',
      operators: getOperatorsForType('INT', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: 'dependencies',
      relationType: 'many',
      searchable: isFieldSearchable('id', 'INT'),
      sortable: false,
      relationModel: 'Service',
      relationField: 'name',
      ui: getDefaultUIConfig('INT', 'dependencyServiceId'),
    },
    // Dependency Service Name (one-to-many relation)
    {
      key: 'dependencies.dependencyService.name',
      label: `Dependency - Service ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: 'dependencies',
      relationType: 'many',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: false,
      relationModel: 'Service',
      relationField: 'name',
      ui: getDefaultUIConfig('STRING', 'dependency service name'),
    },
    // Group ID (filter by groups - special handling needed)
    {
      key: 'groups.id',
      label: `Group - ${formatFieldLabel('id')}`,
      type: 'INT',
      operators: getOperatorsForType('INT', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: 'groups',
      relationType: 'many',
      searchable: isFieldSearchable('id', 'INT'),
      sortable: false,
      relationModel: 'Group',
      relationField: 'name',
      ui: getDefaultUIConfig('INT', 'groupId'),
    },
    // Group Name (filter by groups - special handling needed)
    {
      key: 'groups.name',
      label: `Group - ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: 'groups',
      relationType: 'many',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: false,
      relationModel: 'Group',
      relationField: 'name',
      ui: getDefaultUIConfig('STRING', 'group name'),
    },
  ];
}

