export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  Delivery,
  SalesOrder,
  Retailer,
  DeviceSerial,
  Invoice,
  RetailerLedger,
  StockMovement,
  Inventory,
} from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { receiverName = 'Store Manager', receiverPhone, deliveryNotes } = body;

    const delivery = await Delivery.findById(params.id);
    if (!delivery) return apiError('Delivery not found', 404);

    if (delivery.status === 'COMPLETED') {
      return apiError('Delivery is already marked completed', 400);
    }

    delivery.status = 'COMPLETED';
    delivery.verifiedBy = user.email;
    delivery.verifiedAt = new Date();
    delivery.shopAcknowledgement = {
      receiverName,
      receiverPhone,
    };
    if (deliveryNotes) delivery.deliveryNotes = deliveryNotes;
    await delivery.save();

    // 1. Update Order Status
    if (delivery.orderId) {
      await SalesOrder.findByIdAndUpdate(delivery.orderId, { status: 'DELIVERED' });
    }

    // 2. Mark assigned IMEIs as DELIVERED
    for (const item of delivery.items) {
      if (item.assignedImeis && item.assignedImeis.length > 0) {
        await DeviceSerial.updateMany(
          { imei1: { $in: item.assignedImeis } },
          {
            $set: {
              stockStatus: 'DELIVERED',
              retailerId: delivery.retailerId,
              warrantyStartDate: new Date(),
              warrantyEndDate: new Date(Date.now() + 365 * 86400000),
            },
          }
        );
      }

      // Deduct from warehouse allocated stock
      if (delivery.warehouseId) {
        const inv = await Inventory.findOne({ warehouseId: delivery.warehouseId, productId: item.productId });
        if (inv) {
          inv.allocatedStock = Math.max(0, (inv.allocatedStock || 0) - item.deliveredQuantity);
          inv.onHandStock = Math.max(0, (inv.onHandStock || 0) - item.deliveredQuantity);
          await inv.save();

          await StockMovement.create({
            warehouseId: delivery.warehouseId,
            productId: item.productId,
            movementType: 'DELIVERY_OUT',
            quantity: -item.deliveredQuantity,
            balanceAfter: inv.availableStock,
            referenceId: delivery.deliveryNumber,
            performedBy: user.email,
            notes: `Delivery completed to Retailer: ${receiverName}`,
          });
        }
      }
    }

    // 3. Ensure Tax Invoice exists and Ledger Debit is recorded
    let invoice = await Invoice.findOne({ deliveryId: delivery._id });
    if (!invoice && delivery.orderId) {
      const order = await SalesOrder.findById(delivery.orderId);
      const retailer = await Retailer.findById(delivery.retailerId);

      if (order && retailer) {
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
        const invoiceItems = order.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          hsnCode: '85171200',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          mrp: it.unitPrice * 1.15,
          discountAmount: it.discountAmount || 0,
          taxableAmount: it.taxableAmount,
          cgstRate: 9,
          cgstAmount: it.cgstAmount,
          sgstRate: 9,
          sgstAmount: it.sgstAmount,
          igstRate: it.igstAmount > 0 ? 18 : 0,
          igstAmount: it.igstAmount,
          totalAmount: it.totalAmount,
        }));

        invoice = await Invoice.create({
          invoiceNumber,
          orderId: order._id,
          deliveryId: delivery._id,
          retailerId: retailer._id,
          invoiceDate: new Date(),
          sellerDetails: {
            companyName: 'Salman Enterprises Distribution Ltd.',
            gstin: '29AAACA1234A1Z5',
            pan: 'AAACA1234A',
            address: 'Nexus Technology Park, 4th Floor, Electronic City Phase 1',
            state: 'Karnataka',
            stateCode: '29',
          },
          retailerDetails: {
            shopName: retailer.name,
            ownerName: retailer.ownerName,
            gstin: retailer.gstin,
            address: retailer.address,
            state: retailer.state,
          },
          items: invoiceItems,
          subtotal: order.subtotal,
          totalDiscount: order.discountAmount || 0,
          taxableAmount: order.taxableValue,
          cgstTotal: order.cgstTotal,
          sgstTotal: order.sgstTotal,
          igstTotal: order.igstTotal,
          totalInvoiceValue: order.finalOrderValue,
          amountPaid: 0,
          outstandingBalance: order.finalOrderValue,
          paymentTerms: retailer.paymentTerms || 'Net 15 Days',
          isPaid: false,
        });

        // Update Retailer outstanding balance
        const newBalance = (retailer.outstandingBalance || 0) + order.finalOrderValue;
        retailer.outstandingBalance = newBalance;
        await retailer.save();

        // Create Double-entry Ledger Debit Entry
        await RetailerLedger.create({
          retailerId: retailer._id,
          transactionType: 'INVOICE_DEBIT',
          referenceId: invoice.invoiceNumber,
          date: new Date(),
          debitAmount: order.finalOrderValue,
          creditAmount: 0,
          balance: newBalance,
          description: `Sales Tax Invoice #${invoice.invoiceNumber} for Delivery #${delivery.deliveryNumber}`,
        });
      }
    }

    await logDistributionAction({
      action: 'DELIVERY_CONFIRMED',
      userId: user.id,
      entityType: 'Delivery',
      entityId: delivery._id.toString(),
      details: { deliveryNumber: delivery.deliveryNumber, receiverName },
      req,
    });

    return apiSuccess({
      message: 'Delivery confirmed successfully and invoice generated',
      delivery,
      invoice,
    });
  } catch (err: any) {
    console.error('V1 Deliveries Confirm Error:', err);
    return apiError(err.message || 'Failed to confirm delivery', 500);
  }
}
