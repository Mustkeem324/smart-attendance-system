export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized or employee profile missing' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const record = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employee.id,
          date: todayStr,
        },
      },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    const branch = await prisma.branch.findUnique({
      where: { id: session.employee.branchId },
    });

    const shift = await prisma.shift.findUnique({
      where: { id: session.employee.shiftId },
    });

    return NextResponse.json({
      date: todayStr,
      record: record || null,
      isCheckedIn: Boolean(record?.checkInTime),
      isCheckedOut: Boolean(record?.checkOutTime),
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            address: branch.address,
            latitude: branch.latitude,
            longitude: branch.longitude,
            radiusMeters: branch.radiusMeters,
          }
        : null,
      shift: shift
        ? {
            id: shift.id,
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            gracePeriodMinutes: shift.gracePeriodMinutes,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
