/**
 * List Domains
 * 
 * This index file exports the main list function.
 * All sub-functions are implemented in their own module files.
 */

import { buildWhereClause, mergeWhereClauses, buildSortClause } from '../../../utils/filterBuilder';
import { extractGroupFilters, processGroupFilters } from '../../../utils/filterBuilder/groupFilters';
import type { RequestContext, ListResult } from '../../../types/common';
import { extractParams } from './extractParams';
import { processFilters } from './processFilters';
import { buildSearchWhere } from './buildSearchWhere';
import { prisma } from '../../../dataStore';

/**
 * List with advanced filtering
 * 
 * @param context - Request context containing body, query, params, headers
 * @returns List with pagination metadata
 */
export async function list(context: RequestContext): Promise<ListResult> {
  // Extract and validate parameters from request context
  const { filters, search, page, limit, orderBy } = extractParams(context);

  const offset = (page - 1) * limit;

  // Process filters (convert enums, dates, etc.)
  const processedFilters = processFilters(filters);

  // Build where clauses
  const filterWhere = buildWhereClause(processedFilters);
  const searchWhere = buildSearchWhere(search);
  const where = mergeWhereClauses(filterWhere, searchWhere);

  // Extract and process group filters separately
  const { groupFilters, remainingWhere } = extractGroupFilters(where);
  
  // Add deleted filter
  const finalWhere: any = {
    ...remainingWhere,
    deleted: false,
  };

  // Process group filters if any exist
  if (groupFilters.length > 0) {
    const groupItemIds = await processGroupFilters(groupFilters, 'domain');
    
    if (groupItemIds.length > 0) {
      // Merge with existing id filter if present
      if (finalWhere.id) {
        if (finalWhere.id.in && Array.isArray(finalWhere.id.in)) {
          // Intersect: items must be in both lists
          const existingIds = finalWhere.id.in;
          const intersection = existingIds.filter((id: number) => groupItemIds.includes(id));
          finalWhere.id = { in: intersection };
        } else if (typeof finalWhere.id === 'number') {
          // Single ID - check if it's in groupItemIds
          if (!groupItemIds.includes(finalWhere.id)) {
            finalWhere.id = { in: [] }; // No match
          }
        } else {
          // Other id filter - intersect
          finalWhere.id = { in: groupItemIds };
        }
      } else {
        // No existing id filter, just use group filter
        finalWhere.id = { in: groupItemIds };
      }
    } else {
      // Group filters exist but no items match, return empty result
      finalWhere.id = { in: [] };
    }
  }

  // Build orderBy clause using filterBuilder
  const orderByClause = buildSortClause(orderBy, 'createdAt', 'desc');

  // Execute database queries in parallel
  const [items, total] = await Promise.all([
    prisma.domain.findMany({
      where: finalWhere,
      include: {
        servers: { include: { server: true } },
        services: { include: { service: true } },
        tags: { include: { tag: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: orderByClause,
      skip: offset,
      take: limit,
    }),
    prisma.domain.count({ where: finalWhere }),
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

