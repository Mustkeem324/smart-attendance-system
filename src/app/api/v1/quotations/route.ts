export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Quotation, Retailer, Product } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const retailerId = searchParams.get('retailerId');

    const filter: any = {};
    if (status && status !== 'ALL') filter.status = status;
    if (retailerId && retailerId !== 'ALL') filter.retailerId = retailerId;

    const quotations = await Quotation.find(filter)
      .populate('retailerId', 'name ownerName phone city state dealerCode')
      .populate('convertedOrderId', 'orderNumber status finalOrderValue')
      .sort({ createdAt: -1 })
      .lean();

    return apiSuccess(quotations);
  } catch (err: any) {
    console.error('V1 Quotations GET Error:', err);
    return apiError(err.message || 'Failed to fetch quotations', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { retailerId, items, validDays = 15, paymentTerms = 'Net 15 Days', deliveryTimeline = 'Within 2-3 Business Days', remarks } = body;

    if (!retailerId || !items || !Array.isArray(items) || items.length === 0) {
      return apiError('Retailer ID and line items are required', 400);
    }

    const retailer = await Retailer.findById(retailerId);
    if (!retailer) return apiError('Retailer not found', 404);

    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let finalQuotationValue = 0;

    const isInterState = retailer.state && retailer.state.toLowerCase() !== 'karnataka';
    const processedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (!item.productId || !qty || qty <= 0) {
        return apiError('Each item requires a productId and positive quantity', 400);
      }

      const product = await Product.findById(item.productId);
      if (!product) return apiError(`Product ${item.productId} not found`, 404);

      const unitPrice = Number(item.unitPrice || product.dealerPrice);
      const lineSubtotal = unitPrice * qty;
      const discount = Number(item.discountAmount || 0);
      const lineTaxable = Math.max(0, lineSubtotal - discount);

      const gstRate = product.gstRatePercent || 18;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = Math.round((lineTaxable * gstRate) / 100);
      } else {
        cgst = Math.round((lineTaxable * (gstRate / 2)) / 100);
        sgst = Math.round((lineTaxable * (gstRate / 2)) / 100);
      }

      const lineTotal = lineTaxable + cgst + sgst + igst;

      subtotal += lineSubtotal;
      totalDiscount += discount;
      taxableAmount += lineTaxable;
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;
      finalQuotationValue += lineTotal;

      processedItems.push({
        productId: product._id,
        productName: product.name,
        brand: product.brand,
        sku: product.sku,
        quantity: qty,
        unitPrice,
        discountAmount: discount,
        taxableAmount: lineTaxable,
        gstRatePercent: gstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: lineTotal,
      });
    }

    const quotationNumber = `QTN-${Date.now().toString().slice(-8)}`;
    const validUntil = new Date(Date.now() + validDays * 86400000);

    const quote = await Quotation.create({
      quotationNumber,
      retailerId: retailer._id,
      employeeId: user.id,
      validUntil,
      items: processedItems,
      subtotal,
      totalDiscount,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      finalQuotationValue,
      paymentTerms,
      deliveryTimeline,
      remarks,
      status: 'SENT',
    });

    await logDistributionAction({
      action: 'QUOTATION_CREATED',
      userId: user.id,
      entityType: 'Quotation',
      entityId: quote._id.toString(),
      details: { quotationNumber: quote.quotationNumber, retailerId: retailer._id, finalQuotationValue },
      req,
    });

    return apiSuccess(quote, undefined, 201);
  } catch (err: any) {
    console.error('V1 Quotations POST Error:', err);
    return apiError(err.message || 'Failed to create quotation', 500);
  }
}
