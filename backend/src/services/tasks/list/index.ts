import { Prisma } from '@prisma/client';
import type { RequestContext, ListResult } from '../../../types/common';
import { buildWhereClause, mergeWhereClauses, buildSortClause, isFilterGroup } from '../../../utils/filterBuilder';
import type { Filter } from '../../../types/filterMetadata';
import { extractParams } from './extractParams';
import { processFilters } from './processFilters';
import { buildSearchWhere } from './buildSearchWhere';
import { prisma } from '../../../dataStore';

/**
 * Check if filters have active conditions
 */
function hasActiveFilters(filters?: Filter | Filter[]): boolean {
  if (!filters) return false;
  
  if (Array.isArray(filters)) {
    return filters.length > 0 && filters.some(f => {
      if (f && typeof f === 'object' && 'key' in f) {
        const condition = f as any;
        return condition.operator !== 'isNull' && condition.operator !== 'isNotNull' 
          ? condition.value !== undefined && condition.value !== null && condition.value !== ''
          : true;
      }
      return false;
    });
  }
  
  if (isFilterGroup(filters)) {
    return filters.childs && filters.childs.length > 0;
  }
  
  // It's a single condition
  const condition = filters as any;
  return condition.operator !== 'isNull' && condition.operator !== 'isNotNull' 
    ? condition.value !== undefined && condition.value !== null && condition.value !== ''
    : true;
}

export async function list(context: RequestContext): Promise<ListResult> {
  const params = extractParams(context);

  // Check if advanced filtering is being used
  const useAdvancedFiltering = hasActiveFilters(params.filters) || (params.orderBy && typeof params.orderBy === 'object' && 'key' in params.orderBy);

  if (useAdvancedFiltering) {
    // Advanced filtering path
    const offset = (params.page - 1) * params.limit;

    // Process filters (convert enums, dates, etc.)
    const processedFilters = processFilters(params.filters);

    // Build where clauses
    const filterWhere = buildWhereClause(processedFilters);
    const searchWhere = buildSearchWhere(params.search);
    const deletedWhere = { deleted: false };
    const where = mergeWhereClauses(
      mergeWhereClauses(filterWhere, searchWhere),
      deletedWhere
    );

    // Build orderBy clause using filterBuilder
    const orderByClause = buildSortClause(params.orderBy, 'createdAt', 'desc');

    // Execute database queries in parallel
    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
          assignedToUser: { select: { id: true, name: true, email: true } },
          tester: { select: { id: true, name: true, email: true } },
          attentionToUser: { select: { id: true, name: true, email: true } },
          sprint: { select: { id: true, name: true, status: true } },
          tags: { include: { tag: true } },
          parentTask: { select: { id: true, title: true } },
          _count: {
            select: {
              subtasks: { where: { deleted: false } },
              comments: { where: { deleted: false } },
              dependencies: true,
            },
          },
        } as any,
        orderBy: orderByClause,
        skip: offset,
        take: params.limit,
      } as any),
      prisma.task.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  // Legacy filtering path (for backward compatibility)
  const body = context.body || {};
  const legacyParams = {
    status: body.status,
    type: body.type,
    priority: body.priority,
    assignedTo: body.assignedTo,
    testerId: body.testerId,
    sprintId: body.sprintId,
    createdBy: body.createdBy,
    parentTaskId: body.parentTaskId,
    reopenCountMin: body.reopenCountMin,
    search: params.search,
    page: params.page,
    limit: params.limit,
    sortBy: body.sortBy || 'createdAt',
    sortOrder: (body.sortOrder || 'desc') as 'asc' | 'desc',
    actionableFor: body.actionableFor,
  };

  // Build where clause
  const where: Prisma.TaskWhereInput = {
    deleted: false,
  };

  if (legacyParams.status) {
    where.status = { in: legacyParams.status as any };
  }

  if (legacyParams.type) {
    where.type = { in: legacyParams.type as any };
  }

  if (legacyParams.priority) {
    where.priority = { in: legacyParams.priority as any };
  }

  if (legacyParams.assignedTo) {
    where.assignedTo = { in: legacyParams.assignedTo };
  }

  if (legacyParams.testerId) {
    where.testerId = { in: legacyParams.testerId };
  }

  if (legacyParams.sprintId !== undefined) {
    where.sprintId = legacyParams.sprintId;
  }

  if (legacyParams.createdBy) {
    where.createdBy = { in: legacyParams.createdBy };
  }

  if (legacyParams.parentTaskId !== undefined) {
    where.parentTaskId = legacyParams.parentTaskId;
  }

  if (legacyParams.reopenCountMin !== undefined) {
    where.reopenCount = { gte: legacyParams.reopenCountMin };
  }

  // Handle actionableFor filter
  if (legacyParams.actionableFor) {
    where.OR = [
      { assignedTo: legacyParams.actionableFor },
      { testerId: legacyParams.actionableFor },
      { status: 'pending', createdBy: legacyParams.actionableFor },
    ];
  }

  if (legacyParams.search) {
    const searchOr = [
      { title: { contains: legacyParams.search, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: legacyParams.search, mode: Prisma.QueryMode.insensitive } },
    ];
    if (where.OR) {
      where.OR = [...where.OR, ...searchOr];
    } else {
      where.OR = searchOr;
    }
  }

  // Calculate pagination
  const skip = (legacyParams.page - 1) * legacyParams.limit;

  // Get total count
  const total = await prisma.task.count({ where });

  // Get tasks
  const tasks = await prisma.task.findMany({
    where,
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      tester: { select: { id: true, name: true, email: true } },
        attentionToUser: { select: { id: true, name: true, email: true } },
      sprint: { select: { id: true, name: true, status: true } },
      tags: { include: { tag: true } },
      parentTask: { select: { id: true, title: true } },
      _count: {
        select: {
          subtasks: { where: { deleted: false } },
          comments: { where: { deleted: false } },
          dependencies: true,
        },
      },
    } as any,
    orderBy: { [legacyParams.sortBy]: legacyParams.sortOrder },
    skip,
    take: legacyParams.limit,
  } as any);

  return {
    data: tasks,
    pagination: {
      page: legacyParams.page,
      limit: legacyParams.limit,
      total,
      totalPages: Math.ceil(total / legacyParams.limit),
    },
  };
}
