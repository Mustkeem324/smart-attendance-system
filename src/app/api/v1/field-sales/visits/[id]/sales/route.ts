export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { ShopVisit, Product, PriceOverride } from '@/models/electronics-sales';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { id } = params;
    const body = await req.json();

    const {
      salesLines = [],
      saleDateTime,
      distributorDetails,
      visitRemarks,
    } = body;

    const visit = await ShopVisit.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { visitId: id }],
    });

    if (!visit) {
      return apiError('Shop visit not found', 404);
    }

    if (!Array.isArray(salesLines)) {
      return apiError('salesLines must be an array of selected products', 400);
    }

    // Process each sales line
    const processedLines: any[] = [];
    let totalUnits = 0;
    let standardValue = 0;
    let actualSalesValue = 0;
    let pendingPriceOverridesCount = 0;

    for (let i = 0; i < salesLines.length; i++) {
      const line = salesLines[i];
      if (!line.productId) {
        return apiError(`Product ID missing on line #${i + 1}`, 400);
      }

      const product = await Product.findById(line.productId);
      if (!product) {
        return apiError(`Product with ID "${line.productId}" not found in catalog`, 404);
      }

      const qty = Math.max(1, Math.round(Number(line.quantity) || 1));
      const stdPrice = Number(product.dealerPrice);
      const isManual = line.priceType === 'MANUAL';
      const actualPrice = isManual ? Number(line.actualSellingPrice) : stdPrice;

      if (isNaN(actualPrice) || actualPrice <= 0) {
        return apiError(`Invalid selling price for ${product.name}`, 400);
      }

      const diffPerUnit = actualPrice - stdPrice;
      const discountPercent = stdPrice > 0 ? ((stdPrice - actualPrice) / stdPrice) * 100 : 0;

      // Price approval rule: If price is discounted by > 7%, requires manager approval
      let priceApprovalStatus: 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' = 'NOT_REQUIRED';
      if (isManual) {
        if (!line.manualPriceReason || !line.manualPriceReason.trim()) {
          return apiError(`A valid reason is mandatory for manual price override on "${product.name}"`, 400);
        }
        if (discountPercent > 7 || actualPrice < (product.dealerPrice * 0.92)) {
          priceApprovalStatus = 'PENDING_APPROVAL';
          pendingPriceOverridesCount++;
        } else {
          priceApprovalStatus = 'APPROVED';
        }
      }

      const lineTotal = actualPrice * qty;
      totalUnits += qty;
      standardValue += stdPrice * qty;
      actualSalesValue += lineTotal;

      processedLines.push({
        productId: product._id,
        variantId: line.variantId || `${product.ram || ''}_${product.storage || ''}_${product.color || ''}`.trim(),
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        brandSnapshot: product.brand,
        quantity: qty,
        standardPriceSnapshot: stdPrice,
        actualSellingPrice: actualPrice,
        priceType: isManual ? 'MANUAL' : 'STANDARD',
        priceDifference: diffPerUnit * qty,
        manualPriceReason: isManual ? line.manualPriceReason.trim() : undefined,
        priceApprovalStatus,
        lineTotal,
      });
    }

    // Compute GST 18% (CGST 9% + SGST 9%)
    const taxableAmount = Math.round(actualSalesValue / 1.18);
    const totalTax = actualSalesValue - taxableAmount;
    const cgst = Math.round(totalTax / 2);
    const sgst = totalTax - cgst;

    // Update visit with processed sales lines & totals
    visit.salesLines = processedLines;
    visit.totalProducts = processedLines.length;
    visit.totalUnits = totalUnits;
    visit.standardValue = standardValue;
    visit.actualSalesValue = actualSalesValue;
    visit.totalPriceDifference = actualSalesValue - standardValue;
    visit.taxSummary = {
      taxableAmount,
      cgst,
      sgst,
      totalTax,
      finalTotal: actualSalesValue,
    };

    // Date & Time sold as explicitly requested by user
    if (saleDateTime) {
      visit.saleDateTime = new Date(saleDateTime);
    } else if (!visit.saleDateTime) {
      visit.saleDateTime = new Date();
    }

    // Optional Distributor info as requested by user
    if (distributorDetails) {
      visit.distributorDetails = {
        name: distributorDetails.name?.trim() || undefined,
        phone: distributorDetails.phone?.trim() || undefined,
        email: distributorDetails.email?.trim() || undefined,
      };
    }

    if (visitRemarks) {
      visit.visitRemarks = visitRemarks.trim();
    }

    await visit.save();

    return apiSuccess({
      visitId: visit.visitId || visit._id,
      salesLines: visit.salesLines,
      totalProducts: visit.totalProducts,
      totalUnits: visit.totalUnits,
      standardValue: visit.standardValue,
      actualSalesValue: visit.actualSalesValue,
      totalPriceDifference: visit.totalPriceDifference,
      taxSummary: visit.taxSummary,
      saleDateTime: visit.saleDateTime,
      distributorDetails: visit.distributorDetails,
      pendingPriceOverridesCount,
    });
  } catch (err: any) {
    console.error('Visit Sales POST Error:', err);
    return apiError(err.message || 'Failed to record product sales lines', 500);
  }
}
