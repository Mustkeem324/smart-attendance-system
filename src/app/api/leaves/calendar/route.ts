import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    const departmentId = searchParams.get('departmentId');

    const where: any = {
      organizationId: session.user.organizationId,
      status: 'APPROVED',
    };

    if (month && month.includes('-')) {
      const [y, m] = month.split('-').map(Number);
      const startM = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      const endM = new Date(Date.UTC(y, m, 0, 23, 59, 59));
      where.startDate = { lte: endM };
      where.endDate = { gte: startM };
    }

    if (departmentId) {
      where.employee = { departmentId };
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const holidays = await prisma.holiday.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(month ? { date: { startsWith: month } } : {}),
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      success: true,
      leaves,
      holidays,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
