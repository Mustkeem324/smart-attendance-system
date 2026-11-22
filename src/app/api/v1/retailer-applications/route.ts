export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { RetailerInquiry } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const filter: any = {};
    if (status && status !== 'ALL') filter.status = status;

    const applications = await RetailerInquiry.find(filter).sort({ createdAt: -1 }).lean();

    return apiSuccess(applications);
  } catch (err: any) {
    console.error('V1 Retailer Applications GET Error:', err);
    return apiError(err.message || 'Failed to fetch retailer applications', 500);
  }
}
