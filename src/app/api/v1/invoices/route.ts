export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Invoice, SalesOrder, Retailer, RetailerLedger } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const retailerId = searchParams.get('retailerId');
    const isPaid = searchParams.get('isPaid');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (retailerId && retailerId !== 'ALL') filter.retailerId = retailerId;
    if (isPaid !== null && isPaid !== undefined && isPaid !== '') {
      filter.isPaid = isPaid === 'true';
    }
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'retailerDetails.shopName': { $regex: search, $options: 'i' } },
      ];
    }

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.find(filter)
        .populate('retailerId', 'name ownerName phone city state dealerCode creditLimit outstandingBalance')
        .populate('orderId', 'orderNumber finalOrderValue')
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return apiSuccess(invoices, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Invoices GET Error:', err);
    return apiError(err.message || 'Failed to fetch invoices', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) return apiError('orderId is required', 400);

    const order = await SalesOrder.findById(orderId);
    if (!order) return apiError('Order not found', 404);

    const retailer = await Retailer.findById(order.retailerId);
    if (!retailer) return apiError('Retailer not found', 404);

    const existing = await Invoice.findOne({ orderId: order._id });
    if (existing) {
      return apiError(`Invoice #${existing.invoiceNumber} has already been issued for this order`, 409);
    }

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

    const invoice = await Invoice.create({
      invoiceNumber,
      orderId: order._id,
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

    // Update retailer balance and write ledger debit
    const newBalance = (retailer.outstandingBalance || 0) + order.finalOrderValue;
    retailer.outstandingBalance = newBalance;
    await retailer.save();

    await RetailerLedger.create({
      retailerId: retailer._id,
      transactionType: 'INVOICE_DEBIT',
      referenceId: invoice.invoiceNumber,
      date: new Date(),
      debitAmount: order.finalOrderValue,
      creditAmount: 0,
      balance: newBalance,
      description: `Tax Invoice #${invoice.invoiceNumber} for Order #${order.orderNumber}`,
    });

    await logDistributionAction({
      action: 'INVOICE_GENERATED',
      userId: user.id,
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      details: { invoiceNumber: invoice.invoiceNumber, totalInvoiceValue: invoice.totalInvoiceValue },
      req,
    });

    return apiSuccess(invoice, undefined, 201);
  } catch (err: any) {
    console.error('V1 Invoices POST Error:', err);
    return apiError(err.message || 'Failed to create invoice', 500);
  }
}
