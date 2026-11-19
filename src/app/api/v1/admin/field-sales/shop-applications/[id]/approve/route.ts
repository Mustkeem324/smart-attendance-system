import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { ShopApplication, Retailer } from '@/models/electronics-sales';

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
    const { remarks = 'Shop credentials and physical geofence verified by admin' } = body;

    const application = await ShopApplication.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { applicationId: id }],
    });

    if (!application) {
      return apiError('Shop onboarding application not found', 404);
    }

    application.verificationStatus = 'APPROVED';
    application.reviewedBy = user.name || user.email;
    application.reviewRemarks = remarks;
    application.updatedAt = new Date();
    await application.save();

    // Update retailer to VERIFIED
    if (application.createdRetailerId) {
      await Retailer.findByIdAndUpdate(application.createdRetailerId, {
        $set: {
          verificationStatus: 'VERIFIED',
          status: 'ACTIVE',
        },
      });
    }

    return apiSuccess(application, { message: 'Shop application approved and retailer status set to VERIFIED' });
  } catch (err: any) {
    console.error('Shop Application Approve Error:', err);
    return apiError(err.message || 'Failed to approve shop application', 500);
  }
}
