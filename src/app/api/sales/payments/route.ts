import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordPaymentCollection } from '@/lib/field-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');

    const where: any = { organizationId: session.user.organizationId };
    if (shopId) where.shopId = shopId;
    if (employeeId) where.employeeId = employeeId;
    if (date) where.collectedDate = date;

    const payments = await prisma.paymentCollection.findMany({
      where,
      include: {
        shop: true,
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        delivery: { select: { id: true, deliveryNumber: true, finalDeliveryValue: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({ success: true, count: payments.length, totalCollected, payments });
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
      deliveryId,
      amount,
      paymentMode,
      paymentReference,
      paymentProofUrl,
      collectedDate,
      notes,
    } = body;

    if (!shopId || !amount) {
      return NextResponse.json({ error: 'Shop ID and payment amount are required' }, { status: 400 });
    }

    const payment = await recordPaymentCollection({
      organizationId: session.user.organizationId,
      shopId,
      deliveryId,
      employeeId: session.employee.id,
      amount: parseFloat(amount),
      paymentMode,
      paymentReference,
      paymentProofUrl,
      collectedDate,
      notes,
    });

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${payment.amount} recorded successfully.`,
      payment,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
