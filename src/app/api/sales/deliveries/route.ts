export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createDeliveryEntry } from '@/lib/field-sales-engine';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isElevated = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.SALES_MANAGER as any,
      Role.HR_MANAGER,
    ]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const shopId = searchParams.get('shopId');
    const employeeId = searchParams.get('employeeId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { organizationId: session.user.organizationId };

    if (!isElevated && session.employee) {
      where.employeeId = session.employee.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) where.status = status;
    if (shopId) where.shopId = shopId;

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(`${startDate}T00:00:00Z`),
        lte: new Date(`${endDate}T23:59:59Z`),
      };
    }

    if (search) {
      where.OR = [
        { deliveryNumber: { contains: search, mode: 'insensitive' } },
        { shop: { name: { contains: search, mode: 'insensitive' } } },
        { shop: { address: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        shop: true,
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
        items: {
          include: { product: true },
        },
        photos: true,
        verifications: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, count: deliveries.length, deliveries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      shopId,
      shopVisitId,
      deliveryNotes,
      customerSignatureUrl,
      items,
      photos,
      saveAsDraft,
    } = body;

    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Shop ID and at least one product delivery item are required.' }, { status: 400 });
    }

    const delivery = await createDeliveryEntry({
      organizationId: session.user.organizationId,
      shopId,
      employeeId: session.employee.id,
      shopVisitId,
      deliveryNotes,
      customerSignatureUrl,
      items,
      photos,
      saveAsDraft: Boolean(saveAsDraft),
    });

    return NextResponse.json({
      success: true,
      message: saveAsDraft ? 'Delivery draft saved.' : 'Product delivery submitted for verification.',
      delivery,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
