export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { RetailerInquiry } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { reason = 'Document verification incomplete or criteria not met' } = body;

    const app = await RetailerInquiry.findByIdAndUpdate(
      params.id,
      { status: 'REJECTED', message: `${appMessage(body?.message)} [Rejection Reason: ${reason}]` },
      { new: true }
    );

    if (!app) return apiError('Application not found', 404);

    await logDistributionAction({
      action: 'RETAILER_APPLICATION_REJECTED',
      userId: user.id,
      entityType: 'RetailerInquiry',
      entityId: app._id.toString(),
      details: { reason },
      req,
    });

    return apiSuccess({ message: 'Retailer application marked as rejected', application: app });
  } catch (err: any) {
    console.error('V1 Retailer Applications Reject Error:', err);
    return apiError(err.message || 'Failed to reject application', 500);
  }
}

function appMessage(msg?: string) {
  return msg || '';
}
