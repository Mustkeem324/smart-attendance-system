import { prisma } from './prisma';

export async function createAuditLog({
  organizationId,
  userId,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}: {
  organizationId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        organizationId,
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}
