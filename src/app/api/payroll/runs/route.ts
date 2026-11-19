import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeMonthlyPayrollRun } from '@/lib/payroll-engine';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isElevated = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);
    if (!isElevated) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const runs = await prisma.payrollRun.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        payrollPeriod: true,
        employeeRecords: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, runs });
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
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    const payrollRun = await executeMonthlyPayrollRun({
      organizationId: session.user.organizationId,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      initiatedByUserId: session.user.id,
    });

    return NextResponse.json({ success: true, payrollRun });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
