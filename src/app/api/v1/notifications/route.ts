import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DistributionNotification } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const notifications = await DistributionNotification.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await DistributionNotification.countDocuments({ isRead: false });

    return apiSuccess(notifications, { unreadCount });
  } catch (err: any) {
    console.error('V1 Notifications GET Error:', err);
    return apiError(err.message || 'Failed to fetch notifications', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { title, message, type = 'SYSTEM', link } = body;

    if (!title || !message) return apiError('Title and message are required', 400);

    const notif = await DistributionNotification.create({
      title,
      message,
      type,
      link,
      isRead: false,
    });

    return apiSuccess(notif, undefined, 201);
  } catch (err: any) {
    console.error('V1 Notifications POST Error:', err);
    return apiError(err.message || 'Failed to create notification', 500);
  }
}
