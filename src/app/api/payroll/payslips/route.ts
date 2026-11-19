import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: any = { organizationId: session.user.organizationId };

    if (!isElevated && session.employee) {
      where.employeeId = session.employee.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);

    const payslips = await prisma.payslip.findMany({
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
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return NextResponse.json({ success: true, payslips });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
