export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requestShiftSwap, processShiftSwap } from '@/lib/shift-roster-engine';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isElevated = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
      Role.TEAM_MANAGER,
    ]);

    const where: any = { organizationId: session.user.organizationId };

    if (!isElevated && session.employee) {
      where.OR = [
        { requestorEmployeeId: session.employee.id },
        { targetEmployeeId: session.employee.id },
      ];
    }

    const swapRequests = await prisma.shiftSwapRequest.findMany({
      where,
      include: {
        requestorEmployee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        targetEmployee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, swapRequests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Employee profile required' }, { status: 401 });
    }

    const body = await req.json();
    const { targetEmployeeId, date, proposedShiftId, reason } = body;

    if (!targetEmployeeId || !date || !reason) {
      return NextResponse.json({ error: 'Target employee, date, and reason are required' }, { status: 400 });
    }

    // Default proposedShiftId if not provided: current employee's shift
    let shiftId = proposedShiftId;
    if (!shiftId) {
      shiftId = session.employee.shiftId || '';
    }

    const swap = await requestShiftSwap({
      organizationId: session.user.organizationId,
      requestorEmployeeId: session.employee.id,
      targetEmployeeId,
      date,
      proposedShiftId: shiftId,
      reason,
    });

    return NextResponse.json({ success: true, swap });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
      Role.TEAM_MANAGER,
    ]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { swapRequestId, action, remark } = body;

    if (!swapRequestId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'swapRequestId and action (APPROVE/REJECT) are required' }, { status: 400 });
    }

    const result = await processShiftSwap({
      swapRequestId,
      reviewerUserId: session.user.id,
      action,
      remark,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
