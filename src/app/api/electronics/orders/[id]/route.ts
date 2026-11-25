export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { hasAnyRole, ROLE_GROUPS } from '@/lib/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { SalesOrder } from '@/models/electronics-sales';
import { generateSalesInvoice } from '@/lib/electronics-sales-engine';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAnyRole(session.user.role, ROLE_GROUPS.DISTRIBUTION_PORTAL)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const order = await SalesOrder.findById(params.id).populate('retailerId');
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAnyRole(session.user.role, ROLE_GROUPS.DISTRIBUTION_APPROVE)) {
      return NextResponse.json({ error: 'Forbidden: Sales manager or administrator role required to approve/cancel orders.' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { action } = body;

    const order = await SalesOrder.findById(params.id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (action === 'APPROVE') {
      order.status = 'APPROVED';
      order.approvedBy = session.user.id;
      order.approvedAt = new Date();
      await order.save();

      // Automatically generate GST Tax Invoice on Order Approval
      const invoice = await generateSalesInvoice({
        orderId: order._id.toString(),
        retailerId: order.retailerId.toString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Order approved and GST Tax Invoice generated.',
        order,
        invoice,
      });
    } else if (action === 'CANCEL') {
      order.status = 'CANCELLED';
      await order.save();
      return NextResponse.json({ success: true, message: 'Order cancelled.', order });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
