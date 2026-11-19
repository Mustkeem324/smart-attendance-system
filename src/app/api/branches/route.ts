import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const branches = await prisma.branch.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, code, address, city, country = 'India', latitude, longitude, radiusMeters = 50, timezone = 'Asia/Kolkata' } = body;

    if (!name || !code || !address || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Missing mandatory fields (Name, Code, Address, Latitude, Longitude)' }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        code: code.toUpperCase().trim(),
        address,
        city,
        country,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radiusMeters) || 50,
        timezone,
      },
    });

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
