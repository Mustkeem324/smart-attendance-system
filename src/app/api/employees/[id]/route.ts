import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Permissions check: regular employee can only view themselves
    if (session.user.role === Role.EMPLOYEE && session.employee?.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        branch: true,
        shift: true,
        manager: true,
        user: { select: { id: true, role: true, isActive: true, lastLoginAt: true } },
        leaveBalances: {
          include: { leaveType: true },
        },
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        leaveRequests: {
          include: { leaveType: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        firstName: body.firstName || undefined,
        lastName: body.lastName || undefined,
        phone: body.phone || undefined,
        address: body.address || undefined,
        emergencyContact: body.emergencyContact || undefined,
        designation: body.designation || undefined,
        departmentId: body.departmentId || undefined,
        branchId: body.branchId || undefined,
        shiftId: body.shiftId || undefined,
        managerId: body.managerId !== undefined ? body.managerId : undefined,
        employmentStatus: body.employmentStatus || undefined,
        employmentType: body.employmentType || undefined,
        weeklyOff: body.weeklyOff || undefined,
        baseSalary: body.baseSalary !== undefined ? Number(body.baseSalary) : undefined,
      },
      include: {
        department: true,
        branch: true,
        shift: true,
      },
    });

    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'UPDATE_EMPLOYEE',
      entity: 'Employee',
      entityId: id,
      oldValues: existing,
      newValues: updated,
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
