export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateMonthlyRoster } from '@/lib/shift-roster-engine';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const departmentId = searchParams.get('departmentId');
    const branchId = searchParams.get('branchId');

    const roster = await prisma.shiftRoster.findUnique({
      where: {
        organizationId_month_year: {
          organizationId: session.user.organizationId,
          month,
          year,
        },
      },
      include: {
        entries: {
          where: {
            employee: {
              ...(departmentId ? { departmentId } : {}),
              ...(branchId ? { branchId } : {}),
            },
          },
          include: {
            shift: true,
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
        },
      },
    });

    return NextResponse.json({
      success: true,
      month,
      year,
      roster: roster || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const { month, year, employeeIds, rotationPattern, defaultShiftId } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    let targetEmployeeIds = employeeIds;
    if (!targetEmployeeIds || targetEmployeeIds.length === 0) {
      const activeEmps = await prisma.employee.findMany({
        where: { organizationId: session.user.organizationId, employmentStatus: 'ACTIVE' },
        select: { id: true },
      });
      targetEmployeeIds = activeEmps.map((e) => e.id);
    }

    const result = await generateMonthlyRoster({
      organizationId: session.user.organizationId,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      employeeIds: targetEmployeeIds,
      rotationPattern,
      defaultShiftId,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
