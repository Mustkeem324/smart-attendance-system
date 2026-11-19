import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month'); // YYYY-MM
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      organizationId: session.user.organizationId,
      employeeId: session.employee.id,
    };

    if (date) {
      where.date = date;
    } else if (month) {
      where.date = { startsWith: month };
    } else if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        officeLocation: true,
        events: {
          orderBy: { timestamp: 'asc' },
        },
        exceptions: true,
      },
      orderBy: { date: 'desc' },
      take: 60,
    });

    // Compute monthly summary
    const summary = {
      totalDays: records.length,
      presentDays: records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length,
      lateDays: records.filter((r) => r.lateMinutes > 0).length,
      halfDays: records.filter((r) => r.status === 'HALF_DAY').length,
      totalWorkingHours: Math.round(records.reduce((acc, r) => acc + (r.totalHours || 0), 0) * 100) / 100,
      totalOvertimeHours: Math.round(records.reduce((acc, r) => acc + (r.overtimeHours || 0), 0) * 100) / 100,
    };

    return NextResponse.json({
      success: true,
      summary,
      count: records.length,
      records,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
