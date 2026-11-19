import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const shifts = await prisma.shift.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, shifts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const {
      name,
      code,
      startTime,
      endTime,
      gracePeriodMinutes = 15,
      halfDayThresholdHours = 4.5,
      fullDayThresholdHours = 8.0,
      isOvernight = false,
      isFlexible = false,
    } = body;

    if (!name || !code || !startTime || !endTime) {
      return NextResponse.json({ error: 'Name, code, startTime, and endTime are required' }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        code: code.toUpperCase().trim(),
        startTime,
        endTime,
        gracePeriodMinutes: Number(gracePeriodMinutes),
        halfDayThresholdHours: Number(halfDayThresholdHours),
        fullDayThresholdHours: Number(fullDayThresholdHours),
        isOvernight: Boolean(isOvernight),
        isFlexible: Boolean(isFlexible),
      },
    });

    return NextResponse.json({ success: true, shift });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
