/**
 * List Service
 * 
 * This index file exports the main list function.
 * All sub-functions are implemented in their own module files.
 */

import { buildWhereClause, mergeWhereClauses, buildSortClause } from '../../../utils/filterBuilder';
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

  // Build orderBy clause using filterBuilder
  const orderByClause = buildSortClause(orderBy, 'createdAt', 'desc');

  // Execute database queries in parallel
  const [items, total] = await Promise.all([
    prisma.releaseNote.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            port: true,
          },
        },
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                type: true,
                sprint: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: orderByClause,
      skip: offset,
      take: limit,
    }),
    prisma.releaseNote.count({ where }),
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

