import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SalesOrder } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER', 'INVENTORY_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { status } = body;

    const validStatuses = ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'PARTIALLY_FULFILLED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
    if (!status || !validStatuses.includes(status)) {
      return apiError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const order = await SalesOrder.findByIdAndUpdate(
      params.id,
      { status },
      { new: true }
    );

    if (!order) return apiError('Order not found', 404);

    await logDistributionAction({
      action: 'ORDER_STATUS_CHANGED',
      userId: user.id,
      entityType: 'SalesOrder',
      entityId: order._id.toString(),
      details: { newStatus: status },
      req,
    });

    return apiSuccess(order);
  } catch (err: any) {
    console.error('V1 Orders [id] Status Error:', err);
    return apiError(err.message || 'Failed to update order status', 500);
  }
}
