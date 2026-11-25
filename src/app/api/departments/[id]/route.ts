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

    const department = await prisma.department.findUnique({
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
            employmentStatus: true,
          },
          orderBy: { firstName: 'asc' },
        },
        _count: { select: { employees: true } },
      },
    });

    if (!department || department.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, department });
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

    const existing = await prisma.department.findUnique({ where: { id: params.id } });
    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const body = await req.json();
    const nextCode = body.code ? String(body.code).trim().toUpperCase() : undefined;

    if (nextCode && nextCode !== existing.code) {
      const duplicate = await prisma.department.findFirst({
        where: {
          organizationId: session.user.organizationId,
          code: nextCode,
          id: { not: existing.id },
        },
      });
      if (duplicate) {
        return NextResponse.json({ error: `Department code '${nextCode}' already exists.` }, { status: 409 });
      }
    }

    const updated = await prisma.department.update({
      where: { id: params.id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        code: nextCode,
        description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
      },
      include: { _count: { select: { employees: true } } },
    });

    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'UPDATE_DEPARTMENT',
      entity: 'Department',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
    }).catch(() => {});

    return NextResponse.json({ success: true, department: updated });
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

    const existing = await prisma.department.findUnique({ where: { id: params.id } });
    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const empCount = await prisma.employee.count({
      where: { departmentId: params.id },
    });

    if (empCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department while ${empCount} employee record(s) are assigned to it. Reassign team members first.`,
        },
        { status: 409 }
      );
    }

    await prisma.department.delete({ where: { id: params.id } });

    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'DELETE_DEPARTMENT',
      entity: 'Department',
      entityId: params.id,
      oldValues: existing,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Department deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
