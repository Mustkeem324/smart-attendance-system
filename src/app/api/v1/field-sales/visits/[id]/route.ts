export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { ShopVisit, PriceOverride } from '@/models/electronics-sales';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { id } = params;

    const visit = await ShopVisit.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { visitId: id }],
    })
      .populate('retailerId', 'name ownerName phone altPhone email address locality city state pincode gstin dealerCode latitude longitude geofenceRadiusMeters')
      .lean();

    if (!visit) {
      return apiError('Shop visit not found', 404);
    }

    // Fetch any associated price overrides
    const overrides = await PriceOverride.find({
      visitId: visit.visitId || String(visit._id),
    }).lean();

    return apiSuccess({
      ...visit,
      priceOverrides: overrides,
    });
  } catch (err: any) {
    console.error('Visit Detail GET Error:', err);
    return apiError(err.message || 'Failed to fetch visit details', 500);
  }
}
