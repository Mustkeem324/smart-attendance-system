export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { createAuditLog } from '@/lib/audit';
import { generateActionToken } from '@/lib/tokens';

const VALID_ROLES = new Set<string>(Object.values(Role));

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
  if (errorResponse) return errorResponse;

  try {
    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!existing || existing.organizationId !== user!.organizationId) {
      return apiError('User not found', 404);
    }

    const body = await req.json();

    if (body?.action === 'GENERATE_RESET_LINK') {
      const token = generateActionToken(
        { id: existing.id, email: existing.email, passwordHash: existing.passwordHash },
        'password_reset',
        30
      );
      await createAuditLog({
        organizationId: user!.organizationId,
        userId: user!.id,
        action: 'ADMIN_ISSUED_PASSWORD_RESET',
        entity: 'User',
        entityId: existing.id,
      }).catch(() => {});

      return apiSuccess(
        { resetUrl: `/reset-password?token=${encodeURIComponent(token)}` },
        { message: 'One-time password reset link generated (valid for 30 minutes).' }
      );
    }

    if (body?.action === 'GENERATE_VERIFY_LINK') {
      const token = generateActionToken(
        { id: existing.id, email: existing.email, passwordHash: existing.passwordHash },
        'account_verify',
        120
      );
      return apiSuccess(
        { verifyUrl: `/verify-account?token=${encodeURIComponent(token)}` },
        { message: 'Account verification link generated (valid for 2 hours).' }
      );
    }

    if (existing.role === Role.SUPER_ADMIN && user!.role !== Role.SUPER_ADMIN) {
      return apiError('Only a Super Admin can modify another Super Admin account.', 403);
    }

    const nextRole = body.role ? String(body.role).toUpperCase() : undefined;
    if (nextRole) {
      if (!VALID_ROLES.has(nextRole)) {
        return apiError(`Invalid role: ${body.role}`, 400);
      }
      if (nextRole === Role.SUPER_ADMIN && user!.role !== Role.SUPER_ADMIN) {
        return apiError('Only a Super Admin can grant Super Admin privileges.', 403);
      }
      if (existing.id === user!.id && nextRole !== existing.role) {
        return apiError('You cannot change your own administrative role.', 400);
      }
    }

    if (body.isActive === false && existing.id === user!.id) {
      return apiError('You cannot deactivate your own active session account.', 400);
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: nextRole ? (nextRole as Role) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        refreshToken: body.isActive === false ? null : undefined,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true },
        },
      },
    });

    await createAuditLog({
      organizationId: user!.organizationId,
      userId: user!.id,
      action: 'UPDATE_USER_ACCESS',
      entity: 'User',
      entityId: updated.id,
      oldValues: { role: existing.role, isActive: existing.isActive },
      newValues: { role: updated.role, isActive: updated.isActive },
    }).catch(() => {});

    return apiSuccess(updated, { message: 'User account updated successfully' });
  } catch (err: any) {
    return apiError(err.message || 'Failed to update user', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
  if (errorResponse) return errorResponse;

  try {
    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      include: { employee: { select: { id: true } } },
    });

    if (!existing || existing.organizationId !== user!.organizationId) {
      return apiError('User not found', 404);
    }

    if (existing.id === user!.id) {
      return apiError('You cannot deactivate or delete your own active account.', 400);
    }

    if (existing.role === Role.SUPER_ADMIN && user!.role !== Role.SUPER_ADMIN) {
      return apiError('Only a Super Admin can deactivate another Super Admin.', 403);
    }

    if (existing.role === Role.SUPER_ADMIN) {
      const activeSupers = await prisma.user.count({
        where: {
          organizationId: user!.organizationId,
          role: Role.SUPER_ADMIN,
          isActive: true,
        },
      });
      if (activeSupers <= 1 && existing.isActive) {
        return apiError('Cannot deactivate the last remaining active Super Admin.', 409);
      }
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: { isActive: false, refreshToken: null },
    });

    await createAuditLog({
      organizationId: user!.organizationId,
      userId: user!.id,
      action: 'DEACTIVATE_USER',
      entity: 'User',
      entityId: existing.id,
      oldValues: { isActive: existing.isActive },
      newValues: { isActive: false },
    }).catch(() => {});

    return apiSuccess({ id: existing.id, isActive: false }, { message: 'User access revoked and deactivated safely.' });
  } catch (err: any) {
    return apiError(err.message || 'Failed to deactivate user', 500);
  }
}
