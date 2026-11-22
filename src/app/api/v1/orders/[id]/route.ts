export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SalesOrder, Invoice, Delivery } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const order = await SalesOrder.findById(params.id)
      .populate('retailerId')
      .lean();

    if (!order) return apiError('Order not found', 404);

    const [invoices, deliveries] = await Promise.all([
      Invoice.find({ orderId: order._id }).lean(),
      Delivery.find({ orderId: order._id }).lean(),
    ]);

    return apiSuccess({
      ...order,
      invoices,
      deliveries,
    });
  } catch (err: any) {
    console.error('V1 Orders [id] GET Error:', err);
    return apiError(err.message || 'Failed to fetch order', 500);
  }
}
