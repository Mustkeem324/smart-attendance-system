import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DistributionNotification } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (id) {
      await DistributionNotification.findByIdAndUpdate(id, { isRead: true });
    } else {
      await DistributionNotification.updateMany({ isRead: false }, { isRead: true });
    }

    return apiSuccess({ message: 'Notifications marked as read' });
  } catch (err: any) {
    console.error('V1 Notifications Mark-Read Error:', err);
    return apiError(err.message || 'Failed to update notifications', 500);
  }
}
