export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import {
  ShopVisit,
  Retailer,
  PriceOverride,
} from '@/models/electronics-sales';

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
      confirmedAccurate,
      remarks,
      idempotencyKey,
      submissionStatus = 'ONLINE',
    } = body;

    if (!confirmedAccurate) {
      return apiError('You must confirm that the shop visit and sales details are accurate before submitting', 400);
    }

    const visit = await ShopVisit.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { visitId: id }],
    });

    if (!visit) {
      return apiError('Shop visit record not found', 404);
    }

    // Prevent accidental duplicate submission
    if (visit.visitStatus === 'SUBMITTED' || visit.status === 'COMPLETED') {
      return apiSuccess({
        visitId: visit.visitId || visit._id,
        alreadySubmitted: true,
        submittedAt: visit.updatedAt,
        visitStatus: visit.visitStatus,
      }, { message: 'This visit has already been successfully submitted.' });
    }

    // Validation checks for completed visit
    if (!visit.latitude || !visit.longitude) {
      return apiError('GPS location capture is mandatory before submitting a shop visit', 400);
    }

    // Check photos
    const hasFrontPhoto = Boolean(visit.shopFrontPhoto?.photoUrl);
    const hasInteractionPhoto = Boolean(
      visit.shopInteractionPhoto?.photoUrl ||
      visit.shopInteractionPhoto?.declinedReason ||
      visit.shopInteractionPhoto?.interactionConsentGiven === false
    );

    if (!hasFrontPhoto && (!visit.photos || visit.photos.length === 0)) {
      return apiError('Shop front photograph is required for verification', 400);
    }

    const now = new Date();
    visit.endTime = now;
    visit.checkOutTime = now;
    if (remarks) visit.visitRemarks = remarks.trim();
    visit.status = 'COMPLETED';
    visit.visitStatus = visit.locationVerificationStatus === 'OUTSIDE_GEOFENCE' ? 'FLAGGED_REVIEW' : 'SUBMITTED';
    visit.submissionStatus = submissionStatus;
    visit.confirmedAccurate = true;
    if (idempotencyKey) visit.idempotencyKey = idempotencyKey;

    // Check if any sales lines have manual price overrides requiring manager approval
    const pendingOverrides: any[] = [];
    if (visit.salesLines && visit.salesLines.length > 0) {
      const retailer = await Retailer.findById(visit.retailerId).lean();
      for (let i = 0; i < visit.salesLines.length; i++) {
        const line = visit.salesLines[i];
        if (line.priceType === 'MANUAL' && line.priceApprovalStatus === 'PENDING_APPROVAL') {
          const overrideId = `OVR-${visit.visitId || visit._id}-${i + 1}`;
          const overrideDoc = await PriceOverride.findOneAndUpdate(
            { overrideId },
            {
              $set: {
                overrideId,
                visitId: visit.visitId || String(visit._id),
                shopId: visit.retailerId,
                shopNameSnapshot: retailer?.name || 'Retailer Shop',
                productId: line.productId,
                productNameSnapshot: line.productNameSnapshot,
                skuSnapshot: line.skuSnapshot,
                standardPrice: line.standardPriceSnapshot,
                requestedPrice: line.actualSellingPrice,
                difference: line.priceDifference,
                quantity: line.quantity,
                reason: line.manualPriceReason || 'Field sales manual price request',
                employeeId: visit.employeeId,
                employeeNameSnapshot: user.name || 'Sales Representative',
                approvalStatus: 'PENDING',
              },
            },
            { upsert: true, new: true }
          );
          pendingOverrides.push(overrideDoc);
        }
      }
    }

    await visit.save();

    // Update retailer previous visit date and increment visit count
    await Retailer.findByIdAndUpdate(visit.retailerId, {
      $set: {
        previousVisitDate: visit.visitDate,
        updatedAt: now,
      },
    });

    return apiSuccess({
      visitId: visit.visitId || visit._id,
      shopId: visit.retailerId,
      visitDate: visit.visitDate,
      visitStatus: visit.visitStatus,
      totalProducts: visit.totalProducts || 0,
      totalUnits: visit.totalUnits || 0,
      standardValue: visit.standardValue || 0,
      actualSalesValue: visit.actualSalesValue || 0,
      totalPriceDifference: visit.totalPriceDifference || 0,
      taxSummary: visit.taxSummary,
      googleMapsUrl: visit.googleMapsUrl,
      saleDateTime: visit.saleDateTime,
      distributorDetails: visit.distributorDetails,
      pendingPriceOverrides: pendingOverrides.length,
      submittedAt: now,
    }, {
      message: pendingOverrides.length > 0
        ? `Shop visit submitted successfully! Note: ${pendingOverrides.length} product(s) with manual price adjustments have been routed for manager review.`
        : 'Shop visit and product sales report successfully submitted and recorded permanently in MongoDB.',
    });
  } catch (err: any) {
    console.error('Visit Submit POST Error:', err);
    return apiError(err.message || 'Failed to submit shop visit', 500);
  }
}
