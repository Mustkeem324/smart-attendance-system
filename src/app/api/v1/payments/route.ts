export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PaymentCollection, Retailer, Invoice, RetailerLedger } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const retailerId = searchParams.get('retailerId');
    const paymentMethod = searchParams.get('paymentMethod');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (retailerId && retailerId !== 'ALL') filter.retailerId = retailerId;
    if (paymentMethod && paymentMethod !== 'ALL') filter.paymentMethod = paymentMethod;

    const [total, payments] = await Promise.all([
      PaymentCollection.countDocuments(filter),
      PaymentCollection.find(filter)
        .populate('retailerId', 'name ownerName phone city state dealerCode creditLimit outstandingBalance')
        .populate('invoiceId', 'invoiceNumber totalInvoiceValue outstandingBalance')
        .sort({ collectionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return apiSuccess(payments, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Payments GET Error:', err);
    return apiError(err.message || 'Failed to fetch payments', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'SALES_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      retailerId,
      invoiceId,
      amount,
      paymentMethod = 'UPI',
      transactionReference,
      collectionDate,
      notes,
    } = body;

    const payAmount = parseFloat(amount);
    if (!retailerId || isNaN(payAmount) || payAmount <= 0) {
      return apiError('retailerId and positive payment amount are required', 400);
    }

    const validMethods = ['CASH', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'];
    if (!validMethods.includes(paymentMethod)) {
      return apiError(`Invalid paymentMethod. Allowed: ${validMethods.join(', ')}`, 400);
    }

    const retailer = await Retailer.findById(retailerId);
    if (!retailer) return apiError('Retailer not found', 404);

    const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;
    const effectiveDate = collectionDate || new Date().toISOString().split('T')[0];

    // Allocate against Invoice if specified
    let invoiceNumberRef = '';
    if (invoiceId) {
      const inv = await Invoice.findById(invoiceId);
      if (inv) {
        inv.amountPaid = (inv.amountPaid || 0) + payAmount;
        inv.outstandingBalance = Math.max(0, (inv.outstandingBalance || 0) - payAmount);
        if (inv.outstandingBalance <= 0) {
          inv.isPaid = true;
        }
        await inv.save();
        invoiceNumberRef = inv.invoiceNumber;
      }
    }

    // Record PaymentCollection
    const payment = await PaymentCollection.create({
      receiptNumber,
      retailerId: retailer._id,
      invoiceId: invoiceId || undefined,
      employeeId: user.id,
      amount: payAmount,
      paymentMethod,
      transactionReference: transactionReference || `TXN-${Date.now().toString().slice(-6)}`,
      collectionDate: effectiveDate,
      notes,
      isVerified: true,
      verifiedBy: user.email,
    });

    // Update Retailer outstanding balance
    const newBalance = Math.max(0, (retailer.outstandingBalance || 0) - payAmount);
    retailer.outstandingBalance = newBalance;
    await retailer.save();

    // Create Double-Entry Accounting Ledger Credit Entry
    await RetailerLedger.create({
      retailerId: retailer._id,
      transactionType: 'PAYMENT_CREDIT',
      referenceId: receiptNumber,
      date: new Date(),
      debitAmount: 0,
      creditAmount: payAmount,
      balance: newBalance,
      description: `Payment received via ${paymentMethod} (Ref: ${payment.transactionReference}) ${invoiceNumberRef ? `against Inv #${invoiceNumberRef}` : ''}`,
    });

    await logDistributionAction({
      action: 'PAYMENT_RECORDED',
      userId: user.id,
      entityType: 'PaymentCollection',
      entityId: payment._id.toString(),
      details: { receiptNumber, amount: payAmount, paymentMethod, retailerId: retailer._id },
      req,
    });

    return apiSuccess({
      message: 'Payment recorded and ledger updated successfully',
      payment,
      newRetailerBalance: newBalance,
    }, undefined, 201);
  } catch (err: any) {
    console.error('V1 Payments POST Error:', err);
    return apiError(err.message || 'Failed to record payment', 500);
  }
}
