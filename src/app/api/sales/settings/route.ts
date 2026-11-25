export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEFAULT_FIELD_SALES_SETTINGS = {
  defaultGeofenceRadiusMeters: 100,
  minGpsAccuracyMeters: 25,
  requireShopPhotoOnVisit: true,
  requireCustomerProofOnDelivery: true,
  autoDeductStockOnVerification: true,
  allowPartialPaymentOnDelivery: true,
  defaultPaymentModes: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'],
  maxAllowedLineDiscountPercent: 15,
  workingHoursStart: '08:00',
  workingHoursEnd: '20:00',
};

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, name: true, code: true, settings: true },
    });

    const orgSettings =
      org?.settings && typeof org.settings === 'object' ? (org.settings as Record<string, any>) : {};
    const savedFieldSales =
      orgSettings.fieldSales && typeof orgSettings.fieldSales === 'object'
        ? orgSettings.fieldSales
        : {};

    const settings = {
      ...DEFAULT_FIELD_SALES_SETTINGS,
      ...savedFieldSales,
    };

    return NextResponse.json({
      success: true,
      organization: org ? { id: org.id, name: org.name, code: org.code } : null,
      settings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER', 'HR_MANAGER'].includes(
      session.user.role
    );
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden. Manager or Admin role required.' }, { status: 403 });
    }

    const body = await req.json();
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, settings: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const prevJson =
      org.settings && typeof org.settings === 'object' ? (org.settings as Record<string, any>) : {};
    const prevFieldSales =
      prevJson.fieldSales && typeof prevJson.fieldSales === 'object' ? prevJson.fieldSales : {};

    const nextFieldSales = {
      ...DEFAULT_FIELD_SALES_SETTINGS,
      ...prevFieldSales,
      ...(body && typeof body === 'object' ? body : {}),
      defaultGeofenceRadiusMeters: Math.max(
        50,
        Math.min(500, Number(body?.defaultGeofenceRadiusMeters ?? prevFieldSales.defaultGeofenceRadiusMeters) || 100)
      ),
      minGpsAccuracyMeters: Math.max(
        5,
        Math.min(200, Number(body?.minGpsAccuracyMeters ?? prevFieldSales.minGpsAccuracyMeters) || 25)
      ),
      maxAllowedLineDiscountPercent: Math.max(
        0,
        Math.min(50, Number(body?.maxAllowedLineDiscountPercent ?? prevFieldSales.maxAllowedLineDiscountPercent) || 15)
      ),
    };

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        settings: {
          ...prevJson,
          fieldSales: nextFieldSales,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Field sales settings saved permanently.',
      settings: nextFieldSales,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
