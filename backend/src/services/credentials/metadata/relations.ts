/**
 * Relation definitions for Credentials filter metadata
 */

import type { RelationMetadata } from '../../../types/filterMetadata';
import { formatFieldLabel } from '../../../utils/filterMetadataHelpers';

/**
 * Get all relations
 */
export function getRelations(): RelationMetadata[] {
  return [
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
      name: 'servers',
      type: 'many',
      label: formatFieldLabel('servers'),
      model: 'Server',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'INT' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
      ],
    },
    {
      name: 'services',
      type: 'many',
      label: formatFieldLabel('services'),
      model: 'Service',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'INT' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
      ],
    },
    {
      name: 'tags',
      type: 'many',
      label: formatFieldLabel('tags'),
      model: 'Tag',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'INT' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
      ],
    },
    {
      name: 'groups',
      type: 'many',
      label: formatFieldLabel('groups'),
      model: 'Group',
      fields: [
        { key: 'id', label: formatFieldLabel('id'), type: 'INT' },
        { key: 'name', label: formatFieldLabel('name'), type: 'STRING' },
      ],
    },
  ];
}

