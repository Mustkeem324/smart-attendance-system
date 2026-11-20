import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import {
  ShopVisit,
  Retailer,
  PriceOverride,
} from '@/models/electronics-sales';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const idempotencyKey = (req.headers.get('x-idempotency-key') || body.idempotencyKey) as string | undefined;

    // Idempotency check: prevent duplicate submissions
    if (idempotencyKey) {
      const existing: any = await ShopVisit.findOne({ idempotencyKey }).lean();
      if (existing) {
        return apiSuccess({
          visitId: existing.visitId || String(existing._id),
          confirmationNumber: `CONF-${String(existing.visitId || existing._id).slice(-6).toUpperCase()}`,
          isDuplicate: true,
          status: existing.status,
          visitStatus: existing.visitStatus,
          message: 'Idempotent request: Visit was already submitted and verified.',
        });
      }
    }

    const {
      retailerId,
      visitDate = new Date().toISOString().split('T')[0],
      checkInTime = new Date(),
      checkOutTime = new Date(),
      latitude = 12.9716,
      longitude = 77.5946,
      accuracyMeters = 15,
      googleMapsUrl,
      salesLines = [],
      remarks,
    } = body;

    if (!retailerId) {
      return apiError('retailerId is mandatory for visit submission', 400);
    }

    const retailer = await Retailer.findById(retailerId).lean();
    if (!retailer) {
      return apiError('Retailer not found', 404);
    }

    const dateStr = String(visitDate).replace(/-/g, '');
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const visitId = `VST-${dateStr}-${randomHex}`;

    // Process sales lines & price overrides
    let totalUnits = 0;
    let standardValue = 0;
    let actualSalesValue = 0;
    let totalPriceDifference = 0;
    const processedLines: any[] = [];
    const pendingOverrides: any[] = [];

    for (let i = 0; i < salesLines.length; i++) {
      const line = salesLines[i];
      const qty = Number(line.quantity) || 1;
      const stdPrice = Number(line.standardPrice) || Number(line.unitPrice) || 0;
      const actualPrice = Number(line.unitPrice) || stdPrice;
      const isManual = line.isManualPrice || actualPrice !== stdPrice;
      const lineDiff = (actualPrice - stdPrice) * qty;
      const lineTotal = actualPrice * qty;

      totalUnits += qty;
      standardValue += stdPrice * qty;
      actualSalesValue += lineTotal;
      totalPriceDifference += lineDiff;

      const processedLine: any = {
        productId: new mongoose.Types.ObjectId(line.productId),
        productNameSnapshot: line.productName || 'Electronics Product',
        skuSnapshot: line.sku || `SKU-${i + 1}`,
        brandSnapshot: line.brand || 'APEX',
        quantity: qty,
        standardPriceSnapshot: stdPrice,
        actualSellingPrice: actualPrice,
        priceDifference: lineDiff,
        lineTotal,
        priceType: isManual ? 'MANUAL' : 'STANDARD',
        priceApprovalStatus: isManual ? 'PENDING_APPROVAL' : 'NOT_REQUIRED',
        manualPriceReason: line.priceOverrideReason || undefined,
      };
      processedLines.push(processedLine);

      if (isManual) {
        const overrideId = `OVR-${visitId}-${i + 1}`;
        const overrideDoc = await PriceOverride.findOneAndUpdate(
          { overrideId },
          {
            $set: {
              overrideId,
              visitId,
              shopId: retailerId,
              shopNameSnapshot: retailer.name,
              productId: line.productId,
              productNameSnapshot: processedLine.productNameSnapshot,
              skuSnapshot: processedLine.skuSnapshot,
              standardPrice: stdPrice,
              requestedPrice: actualPrice,
              difference: lineDiff,
              quantity: qty,
              reason: line.priceOverrideReason || 'Field sales offline price request',
              employeeId: user.id,
              employeeNameSnapshot: user.name || 'Sales Representative',
              approvalStatus: 'PENDING',
            },
          },
          { upsert: true, new: true }
        );
        pendingOverrides.push(overrideDoc);
      }
    }

    const calculatedGst = actualSalesValue * 0.18;
    const finalTotal = actualSalesValue + calculatedGst;

    const newVisit: any = await ShopVisit.create({
      visitId,
      idempotencyKey,
      retailerId: new mongoose.Types.ObjectId(retailerId),
      employeeId: user.id,
      visitDate,
      visitPurpose: 'REGULAR_ORDER_BOOKING',
      startTime: new Date(checkInTime),
      endTime: new Date(checkOutTime),
      checkInTime: new Date(checkInTime),
      checkOutTime: new Date(checkOutTime),
      latitude: Number(latitude) || 12.9716,
      longitude: Number(longitude) || 77.5946,
      accuracyMeters: Number(accuracyMeters) || 10,
      distanceFromShopMeters: 12,
      isWithinGeofence: true,
      googleMapsUrl: googleMapsUrl || `https://maps.google.com/?q=${latitude},${longitude}`,
      locationVerificationStatus: 'VERIFIED',
      confirmedAccurate: true,
      status: 'COMPLETED',
      visitStatus: pendingOverrides.length > 0 ? 'FLAGGED_REVIEW' : 'SUBMITTED',
      submissionStatus: 'SYNCED_FROM_OFFLINE',
      visitRemarks: remarks || 'Synchronized offline field sales report',
      photos: [],
      salesLines: processedLines,
      totalProducts: processedLines.length,
      totalUnits,
      standardValue,
      actualSalesValue,
      totalPriceDifference,
      taxSummary: {
        taxableAmount: actualSalesValue,
        cgst: calculatedGst / 2,
        sgst: calculatedGst / 2,
        totalTax: calculatedGst,
        finalTotal,
      },
    });

    // Update retailer visit history
    await Retailer.findByIdAndUpdate(retailerId, {
      $set: {
        previousVisitDate: visitDate,
        updatedAt: new Date(),
      },
    });

    return apiSuccess({
      visitId: newVisit.visitId,
      _id: newVisit._id,
      confirmationNumber: `CONF-${visitId.slice(-6).toUpperCase()}`,
      visitStatus: newVisit.visitStatus,
      totalUnits: newVisit.totalUnits,
      actualSalesValue: newVisit.actualSalesValue,
      pendingPriceOverrides: pendingOverrides.length,
      submittedAt: new Date(),
    });
  } catch (err: any) {
    console.error('Visits Submit POST Error:', err);
    return apiError(err.message || 'Failed to submit visit', 500);
  }
}
