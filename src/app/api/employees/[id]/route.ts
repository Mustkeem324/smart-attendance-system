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

    const { id } = params;
    const body = await req.json();

    const isSelf = session.employee?.id === id;
    const hasElevatedAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);

    if (!hasElevatedAccess && !isSelf) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (body.profilePhoto !== undefined) {
      updateData.profilePhoto = body.profilePhoto;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone;
    }
    if (body.address !== undefined) {
      updateData.address = body.address;
    }
    if (body.emergencyContact !== undefined) {
      updateData.emergencyContact = body.emergencyContact;
    }

    // Elevated-only fields
    if (hasElevatedAccess) {
      if (body.firstName) updateData.firstName = body.firstName;
      if (body.lastName) updateData.lastName = body.lastName;
      if (body.designation) updateData.designation = body.designation;
      if (body.departmentId) updateData.departmentId = body.departmentId;
      if (body.branchId) updateData.branchId = body.branchId;
      if (body.shiftId) updateData.shiftId = body.shiftId;
      if (body.managerId !== undefined) updateData.managerId = body.managerId;
      if (body.employmentStatus) updateData.employmentStatus = body.employmentStatus;
      if (body.employmentType) updateData.employmentType = body.employmentType;
      if (body.weeklyOff) updateData.weeklyOff = body.weeklyOff;
      if (body.baseSalary !== undefined) updateData.baseSalary = Number(body.baseSalary);
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
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
