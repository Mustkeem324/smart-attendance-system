export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DistributionSetting } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    let setting = await DistributionSetting.findOne({ slug: 'default' }).lean();
    if (!setting) {
      setting = await DistributionSetting.create({ slug: 'default' });
    }

    return apiSuccess(setting);
  } catch (err: any) {
    console.error('V1 Settings GET Error:', err);
    return apiError(err.message || 'Failed to fetch settings', 500);
  }
}

export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();

    const updated = await DistributionSetting.findOneAndUpdate(
      { slug: 'default' },
      { $set: body },
      { upsert: true, new: true }
    );

    await logDistributionAction({
      action: 'SETTINGS_UPDATED',
      userId: user.id,
      entityType: 'DistributionSetting',
      entityId: updated._id.toString(),
      details: body,
      req,
    });

    return apiSuccess(updated);
  } catch (err: any) {
    console.error('V1 Settings PUT Error:', err);
    return apiError(err.message || 'Failed to update settings', 500);
  }
}
