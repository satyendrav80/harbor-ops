/**
 * Field definitions for Tasks filter metadata
 */

import type { FilterFieldMetadata } from '../../../types/filterMetadata';
import {
  getOperatorsForType,
  getDefaultUIConfig,
  formatFieldLabel,
  isFieldSearchable,
  isFieldSortable,
  isFieldGroupable,
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
      groupable: isFieldGroupable('id', 'INT'),
      ui: getDefaultUIConfig('INT', 'id'),
    },
    // Title field (searchable text)
    {
      key: 'title',
      label: formatFieldLabel('title'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('title', 'STRING'),
      sortable: isFieldSortable('STRING'),
      groupable: isFieldGroupable('title', 'STRING'),
      ui: {
        ...getDefaultUIConfig('STRING', 'title'),
        placeholder: 'Search in titles...',
      },
    },
    // Description field (searchable text)
    {
      key: 'description',
      label: formatFieldLabel('description'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('description', 'STRING'),
      sortable: isFieldSortable('STRING'),
      groupable: isFieldGroupable('description', 'STRING'),
      ui: {
        ...getDefaultUIConfig('STRING', 'description'),
        placeholder: 'Search in descriptions...',
      },
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
      groupable: isFieldGroupable('status', 'STRING'),
      enumValues: ['pending', 'in_progress', 'in_review', 'testing', 'completed', 'paused', 'blocked', 'cancelled', 'reopened'],
      ui: getDefaultUIConfig('STRING', 'status', true, ['pending', 'in_progress', 'in_review', 'testing', 'completed', 'paused', 'blocked', 'cancelled', 'reopened']),
    },
    // Type field (enum)
    {
      key: 'type',
      label: formatFieldLabel('type'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op => 
        ['eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('type', 'STRING'),
      sortable: isFieldSortable('STRING'),
      groupable: isFieldGroupable('type', 'STRING'),
      enumValues: ['bug', 'feature', 'todo', 'epic', 'improvement'],
      ui: getDefaultUIConfig('STRING', 'type', true, ['bug', 'feature', 'todo', 'epic', 'improvement']),
    },
    // Priority field (enum)
    {
      key: 'priority',
      label: formatFieldLabel('priority'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op => 
        ['eq', 'ne', 'in', 'notIn'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('priority', 'STRING'),
      sortable: isFieldSortable('STRING'),
      groupable: isFieldGroupable('priority', 'STRING'),
      enumValues: ['low', 'medium', 'high', 'critical'],
      ui: getDefaultUIConfig('STRING', 'priority', true, ['low', 'medium', 'high', 'critical']),
    },
    // Sprint ID
    {
      key: 'sprintId',
      label: formatFieldLabel('sprintId'),
      type: 'INT',
      operators: getOperatorsForType('INT', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn', 'isNull', 'isNotNull'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('sprintId', 'INT'),
      sortable: isFieldSortable('INT'),
      groupable: isFieldGroupable('sprintId', 'INT'),
      relationModel: 'Sprint',
      relationField: 'name',
      ui: getDefaultUIConfig('INT', 'sprintId'),
    },
    // Sprint Name (relation field)
    {
      key: 'sprint.name',
      label: `Sprint - ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false),
      relation: 'sprint',
      relationType: 'one',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      groupable: isFieldGroupable('sprint.name', 'STRING', 'one'),
      relationModel: 'Sprint',
      relationField: 'name',
      ui: getDefaultUIConfig('STRING', 'sprint name'),
    },
    // Service ID
    {
      key: 'serviceId',
      label: formatFieldLabel('serviceId'),
      type: 'INT',
      operators: getOperatorsForType('INT', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn', 'isNull', 'isNotNull'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('serviceId', 'INT'),
      sortable: isFieldSortable('INT'),
      groupable: isFieldGroupable('serviceId', 'INT'),
      relationModel: 'Service',
      relationField: 'name',
      ui: getDefaultUIConfig('INT', 'serviceId'),
    },
    // Service Name (relation field)
    {
      key: 'service.name',
      label: `Service - ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false),
      relation: 'service',
      relationType: 'one',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      groupable: isFieldGroupable('service.name', 'STRING', 'one'),
      relationModel: 'Service',
      relationField: 'name',
      ui: getDefaultUIConfig('STRING', 'service name'),
    },
    // Assigned To User ID
    {
      key: 'assignedTo',
      label: formatFieldLabel('assignedTo'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn', 'isNull', 'isNotNull'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('assignedTo', 'STRING'),
      sortable: isFieldSortable('STRING'),
      groupable: isFieldGroupable('assignedTo', 'STRING'),
      relationModel: 'User',
      relationField: 'email',
      ui: getDefaultUIConfig('STRING', 'assignedTo'),
    },
    // Assigned To User Email (relation field)
    {
      key: 'assignedToUser.email',
      label: `Assigned To - ${formatFieldLabel('email')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['eq', 'ne', 'contains', 'startsWith', 'endsWith'].includes(op)
      ),
      relation: 'assignedToUser',
      relationType: 'one',
      searchable: isFieldSearchable('email', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      groupable: isFieldGroupable('assignedToUser.email', 'STRING', 'one'),
      ui: getDefaultUIConfig('STRING', 'email'),
    },
    // Assigned To User Name (relation field)
    {
      key: 'assignedToUser.name',
      label: `Assigned To - ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne'].includes(op)
      ),
      relation: 'assignedToUser',
      relationType: 'one',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      groupable: isFieldGroupable('assignedToUser.name', 'STRING', 'one'),
      ui: getDefaultUIConfig('STRING', 'name'),
    },
    // Attention To User ID (for review/block handoffs)
    {
      key: 'attentionToId',
      label: formatFieldLabel('attentionToId'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn', 'isNull', 'isNotNull'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('attentionToId', 'STRING'),
      sortable: isFieldSortable('STRING'),
      groupable: isFieldGroupable('attentionToId', 'STRING'),
      relationModel: 'User',
      relationField: 'email',
      ui: getDefaultUIConfig('STRING', 'attentionToId'),
    },
    {
      key: 'attentionToUser.email',
      label: `Attention To - ${formatFieldLabel('email')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['eq', 'ne', 'contains', 'startsWith', 'endsWith'].includes(op)
      ),
      relation: 'attentionToUser',
      relationType: 'one',
      searchable: isFieldSearchable('email', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      groupable: isFieldGroupable('attentionToUser.email', 'STRING', 'one'),
      ui: getDefaultUIConfig('STRING', 'email'),
    },
    {
      key: 'attentionToUser.name',
      label: `Attention To - ${formatFieldLabel('name')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne'].includes(op)
      ),
      relation: 'attentionToUser',
      relationType: 'one',
      searchable: isFieldSearchable('name', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      groupable: isFieldGroupable('attentionToUser.name', 'STRING', 'one'),
      ui: getDefaultUIConfig('STRING', 'name'),
    },
    // Tester User ID
    {
      key: 'testerId',
      label: formatFieldLabel('testerId'),
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn', 'isNull', 'isNotNull'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('testerId', 'STRING'),
      sortable: isFieldSortable('STRING'),
      groupable: isFieldGroupable('testerId', 'STRING'),
      relationModel: 'User',
      relationField: 'email',
      ui: getDefaultUIConfig('STRING', 'testerId'),
    },
    // Tester User Email (relation field)
    {
      key: 'tester.email',
      label: `Tester - ${formatFieldLabel('email')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['eq', 'ne', 'contains', 'startsWith', 'endsWith'].includes(op)
      ),
      relation: 'tester',
      relationType: 'one',
      searchable: isFieldSearchable('email', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      groupable: isFieldGroupable('tester.email', 'STRING', 'one'),
      ui: getDefaultUIConfig('STRING', 'email'),
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
      groupable: isFieldGroupable('createdBy', 'STRING'),
      relationModel: 'User',
      relationField: 'email',
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
      groupable: isFieldGroupable('createdByUser.email', 'STRING', 'one'),
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
      groupable: isFieldGroupable('createdByUser.name', 'STRING', 'one'),
      ui: getDefaultUIConfig('STRING', 'name'),
    },
    // Parent Task ID
    {
      key: 'parentTaskId',
      label: formatFieldLabel('parentTaskId'),
      type: 'INT',
      operators: getOperatorsForType('INT', false).filter(op =>
        ['eq', 'ne', 'in', 'notIn', 'isNull', 'isNotNull'].includes(op)
      ),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('parentTaskId', 'INT'),
      sortable: isFieldSortable('INT'),
      groupable: isFieldGroupable('parentTaskId', 'INT'),
      relationModel: 'Task',
      relationField: 'title',
      ui: getDefaultUIConfig('INT', 'parentTaskId'),
    },
    // Parent Task Title (relation field)
    {
      key: 'parentTask.title',
      label: `Parent Task - ${formatFieldLabel('title')}`,
      type: 'STRING',
      operators: getOperatorsForType('STRING', false).filter(op =>
        ['contains', 'startsWith', 'endsWith', 'eq', 'ne'].includes(op)
      ),
      relation: 'parentTask',
      relationType: 'one',
      searchable: isFieldSearchable('title', 'STRING'),
      sortable: isFieldSortable('STRING', 'one'),
      groupable: isFieldGroupable('parentTask.title', 'STRING', 'one'),
      ui: getDefaultUIConfig('STRING', 'title'),
    },
    // Reopen Count
    {
      key: 'reopenCount',
      label: formatFieldLabel('reopenCount'),
      type: 'INT',
      operators: getOperatorsForType('INT', false),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('reopenCount', 'INT'),
      sortable: isFieldSortable('INT'),
      groupable: isFieldGroupable('reopenCount', 'INT'),
      ui: getDefaultUIConfig('INT', 'reopenCount'),
    },
    // Estimated Hours
    {
      key: 'estimatedHours',
      label: formatFieldLabel('estimatedHours'),
      type: 'FLOAT',
      operators: getOperatorsForType('FLOAT', true),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('estimatedHours', 'FLOAT'),
      sortable: isFieldSortable('FLOAT'),
      groupable: isFieldGroupable('estimatedHours', 'FLOAT'),
      ui: getDefaultUIConfig('FLOAT', 'estimatedHours'),
    },
    // Actual Hours
    {
      key: 'actualHours',
      label: formatFieldLabel('actualHours'),
      type: 'FLOAT',
      operators: getOperatorsForType('FLOAT', true),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('actualHours', 'FLOAT'),
      sortable: isFieldSortable('FLOAT'),
      groupable: isFieldGroupable('actualHours', 'FLOAT'),
      ui: getDefaultUIConfig('FLOAT', 'actualHours'),
    },
    // Due Date
    {
      key: 'dueDate',
      label: formatFieldLabel('dueDate'),
      type: 'DATETIME',
      operators: getOperatorsForType('DATETIME', true),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('dueDate', 'DATETIME'),
      sortable: isFieldSortable('DATETIME'),
      groupable: isFieldGroupable('dueDate', 'DATETIME'),
      ui: getDefaultUIConfig('DATETIME', 'dueDate'),
    },
    // Assigned At
    {
      key: 'assignedAt',
      label: formatFieldLabel('assignedAt'),
      type: 'DATETIME',
      operators: getOperatorsForType('DATETIME', true),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('assignedAt', 'DATETIME'),
      sortable: isFieldSortable('DATETIME'),
      groupable: isFieldGroupable('assignedAt', 'DATETIME'),
      ui: getDefaultUIConfig('DATETIME', 'assignedAt'),
    },
    // Completed At
    {
      key: 'completedAt',
      label: formatFieldLabel('completedAt'),
      type: 'DATETIME',
      operators: getOperatorsForType('DATETIME', true),
      relation: null,
      relationType: null,
      searchable: isFieldSearchable('completedAt', 'DATETIME'),
      sortable: isFieldSortable('DATETIME'),
      groupable: isFieldGroupable('completedAt', 'DATETIME'),
      ui: getDefaultUIConfig('DATETIME', 'completedAt'),
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
      groupable: isFieldGroupable('createdAt', 'DATETIME'),
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
      groupable: isFieldGroupable('updatedAt', 'DATETIME'),
      ui: getDefaultUIConfig('DATETIME', 'updatedAt'),
    },
  ];
}
