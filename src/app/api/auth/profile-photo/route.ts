export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import { UserAvatar } from '@/models/electronics-sales';
import { createAuditLog } from '@/lib/audit';

function isAllowedPhotoReference(
  photoUrl: string,
  ownEmployeeId?: string,
  ownUserId?: string
): boolean {
  if (photoUrl === '') return true;
  if (photoUrl.length > 1000) return false;

  // Reject unsafe schemes (javascript:, data: outside upload pipeline, etc.)
  if (photoUrl.startsWith('/api/uploads/profiles/')) {
    const parts = photoUrl.split('/');
    const folder = parts[4];
    return Boolean(folder && (folder === ownEmployeeId || folder === ownUserId));
  }
  if (photoUrl.startsWith('/employees/') || photoUrl.startsWith('/uploads/')) {
    return !photoUrl.includes('..');
  }
  try {
    const parsed = new URL(photoUrl);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const rawPhoto = typeof body.profilePhoto === 'string' ? body.profilePhoto.trim() : '';

    if (!isAllowedPhotoReference(rawPhoto, session.employee?.id, session.user.id)) {
      return NextResponse.json(
        { error: 'Invalid photo reference. Please upload a valid portrait photo inside your personal ID folder.' },
        { status: 400 }
      );
    }

    const finalPhoto = rawPhoto || null;
    let updatedEmployee: any = null;

    if (session.employee?.id) {
      updatedEmployee = await prisma.employee.update({
        where: { id: session.employee.id },
        data: { profilePhoto: finalPhoto },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      });
    }

    try {
      await connectToDatabase();
      await UserAvatar.findOneAndUpdate(
        { userId: session.user.id },
        {
          userId: session.user.id,
          organizationId: session.user.organizationId,
          profilePhoto: finalPhoto || '',
        },
        { upsert: true, new: true }
      );
    } catch (mongoErr) {
      if (!session.employee?.id) {
        throw mongoErr;
      }
      console.error('Mongo UserAvatar sync warning:', mongoErr);
    }

    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: finalPhoto ? 'UPDATE_OWN_PHOTO' : 'REMOVE_OWN_PHOTO',
      entity: session.employee?.id ? 'Employee' : 'User',
      entityId: session.employee?.id || session.user.id,
      newValues: {
        profilePhoto: finalPhoto,
        folder: session.employee?.id || session.user.id,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      profilePhoto: finalPhoto,
      folder: session.employee?.id || session.user.id,
      employee: updatedEmployee,
    });
  } catch (error: any) {
    console.error('Update own photo error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile photo' }, { status: 500 });
  }
}
