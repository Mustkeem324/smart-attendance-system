export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { CompanyAnnouncement } from '@/models/employee-portal';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const readState = body.isRead !== undefined ? Boolean(body.isRead) : true;

    await connectToDatabase();
    const update = readState
      ? { $addToSet: { readByUserIds: session.user.id } }
      : { $pull: { readByUserIds: session.user.id } };

    const updated = await CompanyAnnouncement.findOneAndUpdate(
      { _id: params.id, organizationId: session.user.organizationId },
      update,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      id: String(updated._id),
      isRead: updated.readByUserIds.includes(session.user.id),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update read status' }, { status: 500 });
  }
}
