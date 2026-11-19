import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Delivery, SalesOrder, Retailer, Product, DeviceSerial, Warehouse } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const retailerId = searchParams.get('retailerId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status && status !== 'ALL') filter.status = status;
    if (retailerId && retailerId !== 'ALL') filter.retailerId = retailerId;

    const [total, deliveries] = await Promise.all([
      Delivery.countDocuments(filter),
      Delivery.find(filter)
        .populate('retailerId', 'name ownerName phone city state dealerCode')
        .populate('orderId', 'orderNumber finalOrderValue totalUnits')
        .populate('warehouseId', 'name code')
        .sort({ deliveredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return apiSuccess(deliveries, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Deliveries GET Error:', err);
    return apiError(err.message || 'Failed to fetch deliveries', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INVENTORY_MANAGER', 'SALES_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { orderId, warehouseId, employeeId, items, deliveryNotes } = body;

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return apiError('orderId and delivery items are required', 400);
    }

    const order = await SalesOrder.findById(orderId);
    if (!order) return apiError('Order not found', 404);

    let totalUnitsDelivered = 0;
    let totalDeliveryValue = 0;
    const processedItems = [];

    for (const it of items) {
      const deliveredQty = parseInt(it.deliveredQuantity);
      if (!it.productId || !deliveredQty || deliveredQty <= 0) {
        return apiError('Each delivery item requires productId and positive deliveredQuantity', 400);
      }

      totalUnitsDelivered += deliveredQty;
      const unitPrice = Number(it.unitPrice || 0);
      const totalVal = unitPrice * deliveredQty;
      totalDeliveryValue += totalVal;

      const imeis: string[] = Array.isArray(it.assignedImeis) ? it.assignedImeis : [];

      // If IMEIs provided, track or update DeviceSerial
      for (const imei of imeis) {
        if (imei && imei.trim()) {
          await DeviceSerial.findOneAndUpdate(
            { imei1: imei.trim().toUpperCase() },
            {
              productId: it.productId,
              imei1: imei.trim().toUpperCase(),
              stockStatus: 'DISPATCHED',
              retailerId: order.retailerId,
              orderId: order._id,
              warehouseId,
            },
            { upsert: true }
          );
        }
      }

      processedItems.push({
        productId: it.productId,
        productName: it.productName || 'Electronic Product',
        sku: it.sku || 'SKU-001',
        orderedQuantity: it.orderedQuantity || deliveredQty,
        deliveredQuantity: deliveredQty,
        pendingQuantity: Math.max(0, (it.orderedQuantity || deliveredQty) - deliveredQty),
        damagedQuantity: 0,
        returnedQuantity: 0,
        unitPrice,
        totalValue: totalVal,
        assignedImeis: imeis,
        assignedSerialNumbers: it.assignedSerialNumbers || [],
      });
    }

    const deliveryNumber = `DLV-${Date.now().toString().slice(-8)}`;

    const delivery = await Delivery.create({
      deliveryNumber,
      orderId: order._id,
      retailerId: order.retailerId,
      employeeId: employeeId || user.id,
      warehouseId,
      deliveredAt: new Date(),
      items: processedItems,
      totalUnitsDelivered,
      totalDeliveryValue,
      deliveryNotes,
      status: 'SUBMITTED',
    });

    // Update order status to DISPATCHED
    order.status = 'DISPATCHED';
    await order.save();

    await logDistributionAction({
      action: 'DELIVERY_DISPATCHED',
      userId: user.id,
      entityType: 'Delivery',
      entityId: delivery._id.toString(),
      details: { deliveryNumber: delivery.deliveryNumber, orderNumber: order.orderNumber, totalUnitsDelivered },
      req,
    });

    return apiSuccess(delivery, undefined, 201);
  } catch (err: any) {
    console.error('V1 Deliveries POST Error:', err);
    return apiError(err.message || 'Failed to dispatch delivery', 500);
  }
}
