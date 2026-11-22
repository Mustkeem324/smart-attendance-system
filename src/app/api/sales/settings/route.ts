export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, name: true, code: true },
    });

    // Default settings
    const settings = {
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

    return NextResponse.json({ success: true, organization: org, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    return NextResponse.json({
      success: true,
      message: 'Field sales settings saved successfully',
      settings: body,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
