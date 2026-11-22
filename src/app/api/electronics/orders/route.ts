export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SalesOrder } from '@/models/electronics-sales';
import { createSalesOrder } from '@/lib/electronics-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const retailerId = searchParams.get('retailerId');
    const search = searchParams.get('search');

    const query: any = {};
    if (status) query.status = status;
    if (retailerId) query.retailerId = retailerId;
    if (search) {
      query.$or = [
        { orderNumber: new RegExp(search, 'i') },
      ];
    }

    const orders = await SalesOrder.find(query)
      .populate('retailerId')
      .sort({ orderDate: -1 });

    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const order = await createSalesOrder({
      ...body,
      employeeId: body.employeeId || session.user.id,
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
