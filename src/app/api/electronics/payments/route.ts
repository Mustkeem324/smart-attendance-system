export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { PaymentCollection } from '@/models/electronics-sales';
import { recordPaymentCollection } from '@/lib/electronics-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const retailerId = searchParams.get('retailerId');
    const paymentMethod = searchParams.get('paymentMethod');

    const query: any = {};
    if (retailerId) query.retailerId = retailerId;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const payments = await PaymentCollection.find(query)
      .populate('retailerId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, count: payments.length, payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const payment = await recordPaymentCollection({
      ...body,
      employeeId: body.employeeId || session.user.id,
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
