/**
 * Condition building utilities
 */

import type { FilterCondition, FilterGroup, FilterNode } from '../../types/filterMetadata';

/**
 * Check if a node is a FilterGroup
 */
export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return 'condition' in node && 'childs' in node;
}

/**
 * Check if a key represents a many-to-many relationship
 * Many-to-many relations use the pattern: relationName.field (e.g., 'servers.id', 'tags.name')
 * Or nested: relationName.nestedRelation.field (e.g., 'dependencies.dependencyService.name')
 * Special case: groups (filtered through GroupItem)
 */
function isManyToManyRelation(key: string): { isMany: boolean; relationName?: string; nestedKey?: string; isGroup?: boolean } {
  const fieldParts = key.split('.');
  
  // Many-to-many relations: servers, tags, services, dependencies
  const manyToManyRelations = ['servers', 'tags', 'services', 'dependencies'];
  
  // Special case: groups (filtered through GroupItem, not direct relation)
  if (fieldParts.length >= 2 && fieldParts[0] === 'groups') {
    return {
      isMany: true,
      relationName: 'groups',
      nestedKey: fieldParts.slice(1).join('.'),
      isGroup: true,
    };
  }
  
  if (fieldParts.length >= 2 && manyToManyRelations.includes(fieldParts[0])) {
    // For simple many-to-many: 'servers.id' -> relationName: 'servers', nestedKey: 'id'
    // For nested: 'dependencies.dependencyService.name' -> relationName: 'dependencies', nestedKey: 'dependencyService.name'
    return {
      isMany: true,
      relationName: fieldParts[0],
      nestedKey: fieldParts.slice(1).join('.'), // Join remaining parts
    };
  }
  
  return { isMany: false };
}

/**
 * Build Prisma where clause for a single condition
 */
export function buildConditionClause(condition: FilterCondition): any {
  const { key, operator, value, caseSensitive = false } = condition;

  // Check if this is a many-to-many relation
  const manyToMany = isManyToManyRelation(key);
  
  // Special handling for groups (filtered through GroupItem, not direct relation)
  if (manyToMany.isMany && manyToMany.isGroup && manyToMany.relationName === 'groups') {
    // Groups are filtered through GroupItem, which requires special handling
    // This will be handled separately in the list service functions
    // Return a marker object that can be detected and processed
    return {
      __groupFilter: true,
      field: manyToMany.nestedKey,
      operator,
      value,
    };
  }
  
  if (manyToMany.isMany && manyToMany.relationName && manyToMany.nestedKey) {
    // Handle many-to-many relations using Prisma's 'some' operator
    // The nestedKey can be a simple field (e.g., 'id') or nested relation (e.g., 'dependencyService.name')
    
    // Check if this is a join table relation that needs a nested relation name
    // Join tables: ServiceServer, ServerTag, ServiceTag, etc.
    // For these, we need to access the nested relation (service, server, tag)
    const joinTableNestedRelations: Record<string, string> = {
      'services': 'service',  // ServiceServer -> service
      'servers': 'server',    // ServiceServer -> server
      'tags': 'tag',          // ServerTag/ServiceTag -> tag
    };
    
    const nestedRelationName = joinTableNestedRelations[manyToMany.relationName];
    
    // If we have a nested relation name and the nestedKey is a simple field (not already nested)
    if (nestedRelationName && !manyToMany.nestedKey.includes('.')) {
      // Build the clause for the nested relation field
      const innerClause = buildConditionClause({
        ...condition,
        key: manyToMany.nestedKey, // Use the nested key for inner clause
      });
      
      // Wrap in nested relation, then in 'some' for many-to-many
      return {
        [manyToMany.relationName]: {
          some: {
            [nestedRelationName]: innerClause,
          },
        },
      };
    } else {
      // For nested relations (e.g., 'dependencyService.name') or when no nested relation needed
      const innerClause = buildConditionClause({
        ...condition,
        key: manyToMany.nestedKey, // Use the nested key for inner clause
      });
      
      // Wrap in 'some' for many-to-many
      return {
        [manyToMany.relationName]: {
          some: innerClause,
        },
      };
    }
  }

  // Handle nested fields (e.g., 'service.id', 'createdByUser.name')
  const fieldParts = key.split('.');
  const finalField = fieldParts[fieldParts.length - 1];

  let clause: any = {};

  // Apply operator
  switch (operator) {
    case 'eq':
      clause[finalField] = value;
      break;

    case 'ne':
      clause[finalField] = { not: value };
      break;

    case 'gt':
      clause[finalField] = { gt: value };
      break;

    case 'gte':
      clause[finalField] = { gte: value };
      break;

    case 'lt':
      clause[finalField] = { lt: value };
      break;

    case 'lte':
      clause[finalField] = { lte: value };
      break;

    case 'in':
      if (Array.isArray(value) && value.length > 0) {
        clause[finalField] = { in: value };
      }
      break;

    case 'notIn':
      if (Array.isArray(value) && value.length > 0) {
        clause[finalField] = { notIn: value };
      }
      break;

    case 'contains':
      if (value != null && value !== '') {
        clause[finalField] = { 
          contains: value,
          mode: caseSensitive ? 'default' : 'insensitive'
        };
      }
      break;

    case 'startsWith':
      if (value != null && value !== '') {
        clause[finalField] = { 
          startsWith: value,
          mode: caseSensitive ? 'default' : 'insensitive'
        };
      }
      break;

    case 'endsWith':
      if (value != null && value !== '') {
        clause[finalField] = { 
          endsWith: value,
          mode: caseSensitive ? 'default' : 'insensitive'
        };
      }
      break;

    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        let endValue = value[1];
        // For date fields, ensure the end date includes the full day
        if (finalField.includes('Date') || finalField.includes('At') || condition.type === 'DATE' || condition.type === 'DATETIME') {
          if (endValue instanceof Date) {
            endValue = new Date(endValue);
            endValue.setHours(23, 59, 59, 999);
          } else if (typeof endValue === 'string') {
            const date = new Date(endValue);
            date.setHours(23, 59, 59, 999);
            endValue = date;
          }
        }
        clause[finalField] = { gte: value[0], lte: endValue };
      }
      break;

    case 'isNull':
      clause[finalField] = null;
      break;

    case 'isNotNull':
      clause[finalField] = { not: null };
      break;

    default:
      return {};
  }

  // Handle nested field structure (for one-to-one or one-to-many relations)
  if (fieldParts.length > 1) {
    let nestedClause = clause;
    for (let i = fieldParts.length - 2; i >= 0; i--) {
      nestedClause = { [fieldParts[i]]: nestedClause };
    }
    return nestedClause;
  }

  return clause;
}

