import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { RetailerInquiry, Retailer } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const app = await RetailerInquiry.findById(params.id);
    if (!app) return apiError('Application not found', 404);

    if (app.status === 'APPROVED') {
      return apiError('Application is already approved', 400);
    }

    const count = await Retailer.countDocuments();
    const dealerCode = `APX-DLR-${(count + 101).toString()}`;

    // Create Retailer record
    const retailer = await Retailer.create({
      name: app.businessName,
      ownerName: app.ownerName,
      phone: app.phone,
      email: app.email,
      address: `${app.city}, ${app.state}`,
      city: app.city,
      state: app.state,
      area: app.city,
      pincode: '560001',
      latitude: 12.9716,
      longitude: 77.5946,
      geofenceRadiusMeters: 100,
      shopCategory: 'AUTHORIZED_DEALER',
      gstin: app.gstin || undefined,
      dealerCode,
      creditLimit: 250000,
      paymentTerms: 'Net 15 Days',
      status: 'ACTIVE',
      outstandingBalance: 0,
    });

    app.status = 'APPROVED';
    await app.save();

    await logDistributionAction({
      action: 'RETAILER_APPLICATION_APPROVED',
      userId: user.id,
      entityType: 'RetailerInquiry',
      entityId: app._id.toString(),
      details: { dealerCode, retailerId: retailer._id.toString(), businessName: app.businessName },
      req,
    });

    return apiSuccess({
      message: 'Retailer application approved and retailer account activated',
      dealerCode,
      retailer,
    });
  } catch (err: any) {
    console.error('V1 Retailer Applications Approve Error:', err);
    return apiError(err.message || 'Failed to approve retailer application', 500);
  }
}
