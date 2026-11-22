export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { PriceOverride, ShopVisit } from '@/models/electronics-sales';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HR_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { remarks = 'Manual price override exceeds maximum allowable margin concession.' } = body;

    const override = await PriceOverride.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { overrideId: id }],
    });

    if (!override) {
      return apiError('Price override request not found', 404);
    }

    override.approvalStatus = 'REJECTED';
    override.approvedBy = user.name || user.email;
    override.approvalRemarks = remarks;
    override.reviewedAt = new Date();
    await override.save();

    // Update salesLine in visit if visitId exists
    if (override.visitId) {
      const visit = await ShopVisit.findOne({
        $or: [{ _id: override.visitId.match(/^[0-9a-fA-F]{24}$/) ? override.visitId : null }, { visitId: override.visitId }],
      });
      if (visit && visit.salesLines) {
        for (const line of visit.salesLines) {
          if (String(line.productId) === String(override.productId)) {
            line.priceApprovalStatus = 'REJECTED';
          }
        }
        await visit.save();
      }
    }

    return apiSuccess(override, { message: 'Price override request rejected' });
  } catch (err: any) {
    console.error('Price Override Reject Error:', err);
    return apiError(err.message || 'Failed to reject price override', 500);
  }
}
