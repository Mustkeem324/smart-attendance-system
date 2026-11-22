export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const officeLocations = await prisma.officeLocation.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        branch: true,
        _count: { select: { employees: true, attendanceRecords: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, officeLocations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json();
    const {
      name,
      code,
      address,
      branchId,
      latitude,
      longitude,
      radiusMeters = 50,
      minGpsAccuracyMeters = 30,
      allowedTimeWindows = '00:00-23:59',
      isActive = true,
    } = body;

    if (!name || !code || !address || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Name, code, address, latitude, and longitude are required' }, { status: 400 });
    }

    const office = await prisma.officeLocation.create({
      data: {
        organizationId: session.user.organizationId,
        branchId: branchId || null,
        name,
        code: code.toUpperCase().trim(),
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radiusMeters) || 50,
        minGpsAccuracyMeters: Number(minGpsAccuracyMeters) || 30,
        allowedTimeWindows,
        isActive: Boolean(isActive),
      },
      include: { branch: true },
    });

    // Audit log
    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'CREATE_OFFICE_LOCATION',
      entity: 'OfficeLocation',
      entityId: office.id,
      newValues: office,
    });

    return NextResponse.json({ success: true, officeLocation: office });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
