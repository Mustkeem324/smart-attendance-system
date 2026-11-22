export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateAndRecordOvertime } from '@/lib/shift-roster-engine';
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

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    const status = searchParams.get('status');

    const where: any = {
      employee: { organizationId: session.user.organizationId },
    };

    if (!isElevated && session.employee) {
      where.employeeId = session.employee.id;
    }

    if (month) {
      where.date = { startsWith: month };
    }

    if (status) {
      where.status = status;
    }

    const records = await prisma.overtimeRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalHours = records.reduce((acc, r) => acc + (r.approvedHours || r.calculatedHours), 0);
    const totalAmount = records.reduce((acc, r) => acc + r.rateAmount, 0);

    return NextResponse.json({
      success: true,
      records,
      summary: { totalHours, totalAmount },
    });
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
    ]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { id, action, remark } = body; // action: 'APPROVE' | 'REJECT'

    if (!id || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Valid id and action (APPROVE/REJECT) are required' }, { status: 400 });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await prisma.overtimeRecord.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedByUserId: session.user.id,
        reviewRemark: remark || `Overtime ${newStatus.toLowerCase()} by HR`,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
