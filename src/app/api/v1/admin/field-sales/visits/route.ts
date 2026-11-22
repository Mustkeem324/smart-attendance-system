export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { ShopVisit } from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (date) filter.visitDate = date;
    if (status && status !== 'ALL') {
      filter.$or = [{ visitStatus: status }, { status }];
    }

    const [total, visits] = await Promise.all([
      ShopVisit.countDocuments(filter),
      ShopVisit.find(filter)
        .populate('retailerId', 'name ownerName phone address city area dealerCode gstin latitude longitude')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return apiSuccess(visits, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Admin Visits GET Error:', err);
    return apiError(err.message || 'Failed to fetch admin field visits', 500);
  }
}
