/**
 * List Service
 * 
 * This index file exports the main list function.
 * All sub-functions are implemented in their own module files.
 */

import { buildWhereClause, mergeWhereClauses, buildSortClause } from '../../../utils/filterBuilder';
import type { RequestContext, ListResult } from '../../../types/common';
import type { GroupByItem } from '../../../types/filterMetadata';
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
  const { filters, search, page, limit, orderBy, groupBy } = extractParams(context);

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
                serviceId: true,
                service: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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

  const groupedData = buildGroupedData(items, groupBy);

  return {
    data: items,
    groupedData,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function buildGroupedData(items: any[], groupBy?: GroupByItem[]) {
  if (!groupBy || groupBy.length === 0) {
    return undefined;
  }

  const serviceGroup = groupBy.find(
    (group) => group.key === 'serviceId' || group.key === 'service.name'
  );

  if (!serviceGroup) {
    return undefined;
  }

  const groups = new Map<
    string,
    {
      key: string | number | null;
      label: string;
      items: any[];
      meta: {
        serviceId: number | null;
        serviceName: string | null;
        servicePort: number | null;
      };
    }
  >();

  items.forEach((item) => {
    const serviceId = item.service?.id ?? item.serviceId ?? null;
    const serviceName = item.service?.name ?? null;
    const servicePort = item.service?.port ?? null;
    const mapKey =
      serviceId !== null ? `service:${serviceId}` : `service:none:${serviceName || 'unknown'}`;

    if (!groups.has(mapKey)) {
      groups.set(mapKey, {
        key: serviceId,
        label: serviceName || 'No Service',
        items: [],
        meta: {
          serviceId,
          serviceName,
          servicePort,
        },
      });
    }

    groups.get(mapKey)!.items.push(item);
  });

  const direction = serviceGroup.direction === 'desc' ? 'desc' : 'asc';

  return Array.from(groups.values())
    .sort((a, b) => {
      const aLabel = a.label || '';
      const bLabel = b.label || '';
      return direction === 'desc' ? bLabel.localeCompare(aLabel) : aLabel.localeCompare(bLabel);
    })
    .map((group) => ({
      key: group.key,
      label: group.label,
      count: group.items.length,
      items: group.items,
      meta: group.meta,
    }));
}

