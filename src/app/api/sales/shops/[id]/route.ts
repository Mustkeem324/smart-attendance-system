export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assignShopToEmployee } from '@/lib/field-sales-engine';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const shop = await prisma.shop.findUnique({
      where: { id: params.id },
      include: {
        assignedEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, phone: true },
        },
        visits: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { checkInTime: 'desc' },
          take: 10,
        },
        deliveries: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
            items: { include: { product: true } },
            photos: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!shop || shop.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, shop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { assignedEmployeeId, name, ownerName, phone, address, city, area, pincode, status } = body;

    // Handle employee assignment
    if (assignedEmployeeId !== undefined) {
      await assignShopToEmployee({
        organizationId: session.user.organizationId,
        shopId: params.id,
        employeeId: assignedEmployeeId,
      });
    }

    const updated = await prisma.shop.update({
      where: { id: params.id },
      data: {
        ...(name ? { name } : {}),
        ...(ownerName ? { ownerName } : {}),
        ...(phone ? { phone } : {}),
        ...(address ? { address } : {}),
        ...(city ? { city } : {}),
        ...(area ? { area } : {}),
        ...(pincode ? { pincode } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({ success: true, shop: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
