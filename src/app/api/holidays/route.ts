export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || String(new Date().getFullYear());

    const holidays = await prisma.holiday.findMany({
      where: {
        organizationId: session.user.organizationId,
        date: { startsWith: year },
      },
      include: { branch: true },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ success: true, holidays });
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
    const { name, date, isOptional = false, branchId, description } = body;

    if (!name || !date) {
      return NextResponse.json({ error: 'Holiday name and date are required' }, { status: 400 });
    }

    const holiday = await prisma.holiday.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        date,
        isOptional: Boolean(isOptional),
        branchId: branchId || null,
        description,
      },
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
