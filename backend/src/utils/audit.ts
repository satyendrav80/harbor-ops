import { AuditResourceType, AuditAction } from '@prisma/client';
import { prisma } from '../dataStore';

interface AuditLogData {
  resourceType: AuditResourceType;
  resourceId: string;
  action: AuditAction;
  userId?: string;
  changes?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Generic audit logging function
 */
export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    await prisma.audit.create({
      data: {
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        action: data.action,
        userId: data.userId || null,
        changes: data.changes || null,
        metadata: data.metadata || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Helper to get changes between old and new records
 */
export function getChanges(oldRecord: any, newRecord: any): any {
  const changes: any = {};
  
  for (const key in newRecord) {
    if (oldRecord[key] !== newRecord[key] && key !== 'updatedAt' && key !== 'updatedBy') {
      changes[key] = {
        before: oldRecord[key],
        after: newRecord[key],
      };
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Helper to extract request metadata
 */
export function getRequestMetadata(req: any): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

