export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
      include: {
        employees: {
          where: { employmentStatus: { notIn: ['TERMINATED', 'RESIGNED'] } },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: true,
            email: true,
          },
          take: 50,
        },
        _count: { select: { employees: true, officeLocations: true } },
      },
    });

    if (!branch || branch.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const existing = await prisma.branch.findUnique({ where: { id: params.id } });
    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const body = await req.json();
    const nextCode = body.code ? String(body.code).trim().toUpperCase() : undefined;

    if (nextCode && nextCode !== existing.code) {
      const duplicate = await prisma.branch.findFirst({
        where: {
          organizationId: session.user.organizationId,
          code: nextCode,
          id: { not: existing.id },
        },
      });
      if (duplicate) {
        return NextResponse.json({ error: `Branch code '${nextCode}' already exists.` }, { status: 409 });
      }
    }

    const updated = await prisma.branch.update({
      where: { id: params.id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        code: nextCode,
        address: body.address ? String(body.address).trim() : undefined,
        city: body.city !== undefined ? (body.city ? String(body.city).trim() : null) : undefined,
        country: body.country ? String(body.country).trim() : undefined,
        latitude: body.latitude !== undefined ? Number(body.latitude) : undefined,
        longitude: body.longitude !== undefined ? Number(body.longitude) : undefined,
        radiusMeters:
          body.radiusMeters !== undefined
            ? Math.max(25, Math.min(2000, Number(body.radiusMeters) || existing.radiusMeters))
            : undefined,
        timezone: body.timezone ? String(body.timezone).trim() : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
      include: { _count: { select: { employees: true, officeLocations: true } } },
    });

    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'UPDATE_BRANCH',
      entity: 'Branch',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
    }).catch(() => {});

    return NextResponse.json({ success: true, branch: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const existing = await prisma.branch.findUnique({ where: { id: params.id } });
    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const empCount = await prisma.employee.count({
      where: { branchId: params.id },
    });

    if (empCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete branch while ${empCount} employee record(s) reference it. Reassign employees before removing this branch.`,
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.officeLocation.updateMany({
        where: { branchId: params.id },
        data: { branchId: null },
      });
      await tx.holiday.updateMany({
        where: { branchId: params.id },
        data: { branchId: null },
      });
      await tx.branch.delete({ where: { id: params.id } });
    });

    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'DELETE_BRANCH',
      entity: 'Branch',
      entityId: params.id,
      oldValues: existing,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Branch removed successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
