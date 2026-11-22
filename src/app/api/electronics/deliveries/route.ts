export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Delivery } from '@/models/electronics-sales';
import { createActualDelivery } from '@/lib/electronics-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const retailerId = searchParams.get('retailerId');

    const query: any = {};
    if (status) query.status = status;
    if (retailerId) query.retailerId = retailerId;

    const deliveries = await Delivery.find(query)
      .populate('retailerId')
      .populate('orderId')
      .sort({ deliveredAt: -1 });

    return NextResponse.json({ success: true, count: deliveries.length, deliveries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const delivery = await createActualDelivery({
      ...body,
      employeeId: body.employeeId || session.user.id,
    });

    return NextResponse.json({ success: true, delivery });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
