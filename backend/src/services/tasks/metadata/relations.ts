/**
 * Relation definitions for Tasks filter metadata
 */

import type { RelationMetadata } from '../../../types/filterMetadata';
import { formatFieldLabel } from '../../../utils/filterMetadataHelpers';

/**
 * Get all relations
 */
export function getRelations(): RelationMetadata[] {
  return [
    {
      name: 'sprint',
      type: 'one',
      label: formatFieldLabel('sprint'),
      model: 'Sprint',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'INT' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
        { key: 'status', label: formatFieldLabel('status'), type: 'STRING' },
      ],
    },
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
      name: 'assignedToUser',
      type: 'one',
      label: formatFieldLabel('assignedToUser'),
      model: 'User',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'STRING' },
        { key: 'email', label: formatFieldLabel('email'), type: 'STRING' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
      ],
    },
    {
      name: 'tester',
      type: 'one',
      label: formatFieldLabel('tester'),
      model: 'User',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'STRING' },
        { key: 'email', label: formatFieldLabel('email'), type: 'STRING' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
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
    {
      name: 'parentTask',
      type: 'one',
      label: formatFieldLabel('parentTask'),
      model: 'Task',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'INT' },
        { key: 'title', label: formatFieldLabel('title'), type: 'STRING' },
        { key: 'status', label: formatFieldLabel('status'), type: 'STRING' },
      ],
    },
  ];
}
