import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params;
    const body = await req.json();

    const existing = await prisma.officeLocation.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Office location not found' }, { status: 404 });
    }

    const updated = await prisma.officeLocation.update({
      where: { id },
      data: {
        name: body.name || undefined,
        address: body.address || undefined,
        branchId: body.branchId !== undefined ? body.branchId : undefined,
        latitude: body.latitude !== undefined ? Number(body.latitude) : undefined,
        longitude: body.longitude !== undefined ? Number(body.longitude) : undefined,
        radiusMeters: body.radiusMeters !== undefined ? Number(body.radiusMeters) : undefined,
        minGpsAccuracyMeters: body.minGpsAccuracyMeters !== undefined ? Number(body.minGpsAccuracyMeters) : undefined,
        allowedTimeWindows: body.allowedTimeWindows !== undefined ? body.allowedTimeWindows : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
      include: { branch: true },
    });

    // If assigned employee IDs are provided, re-assign them
    if (Array.isArray(body.assignEmployeeIds)) {
      await prisma.employee.updateMany({
        where: {
          organizationId: session.user.organizationId,
          id: { in: body.assignEmployeeIds },
        },
        data: { officeLocationId: id },
      });
    }

    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'UPDATE_OFFICE_LOCATION',
      entity: 'OfficeLocation',
      entityId: id,
      oldValues: existing,
      newValues: updated,
    });

    return NextResponse.json({ success: true, officeLocation: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const office = await prisma.officeLocation.findUnique({
      where: { id },
      include: {
        branch: true,
        employees: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: true,
            email: true,
          },
        },
      },
    });

    if (!office || office.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Office location not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, officeLocation: office });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
