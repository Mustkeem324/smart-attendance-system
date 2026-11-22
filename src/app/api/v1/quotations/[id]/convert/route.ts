export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Quotation, SalesOrder, Retailer, Inventory, StockMovement } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const quotation = await Quotation.findById(params.id);
    if (!quotation) return apiError('Quotation not found', 404);

    if (quotation.status === 'CONVERTED') {
      return apiError('Quotation has already been converted to an order', 400);
    }

    const retailer = await Retailer.findById(quotation.retailerId);
    if (!retailer) return apiError('Retailer not found', 404);

    // Reserve stock for items
    let totalUnits = 0;
    const orderItems = [];

    for (const it of quotation.items) {
      totalUnits += it.quantity;
      orderItems.push({
        productId: it.productId,
        productName: it.productName,
        brand: it.brand,
        model: it.productName,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountAmount: it.discountAmount,
        taxableAmount: it.taxableAmount,
        gstRatePercent: it.gstRatePercent,
        cgstAmount: it.cgstAmount,
        sgstAmount: it.sgstAmount,
        igstAmount: it.igstAmount,
        totalAmount: it.totalAmount,
      });

      const inv = await Inventory.findOne({ productId: it.productId });
      if (inv) {
        inv.availableStock = Math.max(0, inv.availableStock - it.quantity);
        inv.allocatedStock = (inv.allocatedStock || 0) + it.quantity;
        await inv.save();

        await StockMovement.create({
          warehouseId: inv.warehouseId,
          productId: it.productId,
          movementType: 'ORDER_RESERVATION',
          quantity: -it.quantity,
          balanceAfter: inv.availableStock,
          performedBy: user.email,
          notes: `Converted from Quotation ${quotation.quotationNumber}`,
        });
      }
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
    const order = await SalesOrder.create({
      orderNumber,
      retailerId: retailer._id,
      employeeId: user.id,
      orderDate: new Date(),
      items: orderItems,
      totalLines: quotation.items.length,
      totalUnits,
      subtotal: quotation.subtotal,
      discountAmount: quotation.totalDiscount,
      taxableValue: quotation.taxableAmount,
      cgstTotal: quotation.cgstTotal,
      sgstTotal: quotation.sgstTotal,
      igstTotal: quotation.igstTotal,
      finalOrderValue: quotation.finalQuotationValue,
      paymentTerms: quotation.paymentTerms,
      deliveryPreference: 'Standard Dispatch',
      remarks: `Converted from Quotation: ${quotation.quotationNumber}`,
      status: 'APPROVED',
      approvedBy: user.email,
      approvedAt: new Date(),
    });

    quotation.status = 'CONVERTED';
    quotation.convertedOrderId = order._id;
    await quotation.save();

    await logDistributionAction({
      action: 'QUOTATION_CONVERTED_TO_ORDER',
      userId: user.id,
      entityType: 'Quotation',
      entityId: quotation._id.toString(),
      details: { quotationNumber: quotation.quotationNumber, orderNumber: order.orderNumber },
      req,
    });

    return apiSuccess({
      message: 'Quotation successfully converted to confirmed sales order',
      order,
    });
  } catch (err: any) {
    console.error('V1 Quotations Convert Error:', err);
    return apiError(err.message || 'Failed to convert quotation to order', 500);
  }
}
