import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month'); // YYYY-MM
    const branchId = searchParams.get('branchId');
    const departmentId = searchParams.get('departmentId');
    const status = searchParams.get('status');
    const queryEmployeeId = searchParams.get('employeeId');

    const isElevated = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
      Role.TEAM_MANAGER,
    ]);

    const where: any = {
      organizationId: session.user.organizationId,
    };

    // If regular employee, strictly restrict to own records
    if (!isElevated || (!queryEmployeeId && session.user.role === Role.EMPLOYEE)) {
      if (!session.employee) {
        return NextResponse.json({ records: [] });
      }
      where.employeeId = session.employee.id;
    } else if (queryEmployeeId) {
      where.employeeId = queryEmployeeId;
    }

    if (date) {
      where.date = date;
    } else if (month) {
      where.date = { startsWith: month };
    }

    if (status) {
      where.status = status;
    }

    if (branchId || departmentId) {
      where.employee = {
        ...(branchId ? { branchId } : {}),
        ...(departmentId ? { departmentId } : {}),
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
            branch: true,
            shift: true,
          },
        },
        events: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
