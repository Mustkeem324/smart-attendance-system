export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createShop } from '@/lib/field-sales-engine';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const area = searchParams.get('area');
    const assignedEmployeeId = searchParams.get('assignedEmployeeId');
    const myShopsOnly = searchParams.get('myShopsOnly') === 'true';

    const where: any = {
      organizationId: session.user.organizationId,
      status: 'ACTIVE',
    };

    if (myShopsOnly && session.employee) {
      where.assignedEmployeeId = session.employee.id;
    } else if (assignedEmployeeId) {
      where.assignedEmployeeId = assignedEmployeeId;
    }

    if (city) where.city = { equals: city, mode: 'insensitive' };
    if (area) where.area = { equals: area, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const shops = await prisma.shop.findMany({
      where,
      include: {
        assignedEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            phone: true,
          },
        },
        _count: {
          select: { visits: true, deliveries: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, count: shops.length, shops });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      name,
      ownerName,
      phone,
      altPhone,
      email,
      address,
      city,
      area,
      pincode,
      latitude,
      longitude,
      geofenceRadiusMeters,
      category,
      assignedEmployeeId,
    } = body;

    if (!name || !ownerName || !phone || !address || !city || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Name, owner name, phone, address, city, and GPS coordinates (latitude, longitude) are required' }, { status: 400 });
    }

    const shop = await createShop({
      organizationId: session.user.organizationId,
      name,
      ownerName,
      phone,
      altPhone,
      email,
      address,
      city,
      area: area || city,
      pincode: pincode || '000000',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      geofenceRadiusMeters: geofenceRadiusMeters ? parseFloat(geofenceRadiusMeters) : 100.0,
      category,
      assignedEmployeeId: assignedEmployeeId || (session.employee ? session.employee.id : undefined),
    });

    return NextResponse.json({ success: true, shop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
