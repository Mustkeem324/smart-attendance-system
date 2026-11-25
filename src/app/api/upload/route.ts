export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import {
  detectImageType,
  sanitizeFolderId,
  saveProfilePhotoAsset,
} from '@/lib/profile-photo-storage';

const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024; // 4.5MB safe across local & serverless limits

async function resolveTargetFolder(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
  requestedEmployeeId?: string | null,
  requestedUserId?: string | null
): Promise<{ ownerId: string; ownerType: 'employee' | 'user' } | { error: string; status: number }> {
  const isElevated = requireRole(session.user.role, [
    Role.SUPER_ADMIN,
    Role.COMPANY_ADMIN,
    Role.HR_MANAGER,
  ]);

  if (requestedEmployeeId) {
    const cleanEmpId = sanitizeFolderId(requestedEmployeeId);
    if (!cleanEmpId) {
      return { error: 'Invalid employee ID specified for upload folder.', status: 400 };
    }
    if (!isElevated && session.employee?.id !== cleanEmpId) {
      return { error: 'Forbidden: You can only upload photos to your own ID folder.', status: 403 };
    }
    const targetEmp = await prisma.employee.findUnique({
      where: { id: cleanEmpId },
      select: { id: true, organizationId: true },
    });
    if (!targetEmp || targetEmp.organizationId !== session.user.organizationId) {
      return { error: 'Target employee not found in your organization.', status: 404 };
    }
    return { ownerId: targetEmp.id, ownerType: 'employee' };
  }

  if (requestedUserId) {
    const cleanUserId = sanitizeFolderId(requestedUserId);
    if (!cleanUserId) {
      return { error: 'Invalid user ID specified for upload folder.', status: 400 };
    }
    if (!isElevated && session.user.id !== cleanUserId) {
      return { error: 'Forbidden: You can only upload photos to your own ID folder.', status: 403 };
    }
    const targetUser = await prisma.user.findUnique({
      where: { id: cleanUserId },
      select: { id: true, organizationId: true, employee: { select: { id: true } } },
    });
    if (!targetUser || targetUser.organizationId !== session.user.organizationId) {
      return { error: 'Target user not found in your organization.', status: 404 };
    }
    if (targetUser.employee?.id) {
      return { ownerId: targetUser.employee.id, ownerType: 'employee' };
    }
    return { ownerId: targetUser.id, ownerType: 'user' };
  }

  // Default to the authenticated user's employee ID folder or user ID folder
  if (session.employee?.id) {
    return { ownerId: session.employee.id, ownerType: 'employee' };
  }
  return { ownerId: session.user.id, ownerType: 'user' };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';

    // Case 1: multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
      }

      const targetEmpId = (formData.get('targetEmployeeId') || formData.get('employeeId')) as string | null;
      const targetUserId = (formData.get('targetUserId') || formData.get('userId')) as string | null;
      const folderResolution = await resolveTargetFolder(session, targetEmpId, targetUserId);
      if ('error' in folderResolution) {
        return NextResponse.json({ error: folderResolution.error }, { status: folderResolution.status });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: 'Photo exceeds 4.5MB limit. Please upload a clear compressed portrait under 4.5MB.' },
          { status: 400 }
        );
      }

      const detected = detectImageType(buffer);
      if (!detected) {
        return NextResponse.json(
          { error: 'Invalid image file. Please upload a valid JPG, PNG, or WebP portrait photo.' },
          { status: 400 }
        );
      }

      const saved = await saveProfilePhotoAsset({
        ownerId: folderResolution.ownerId,
        ownerType: folderResolution.ownerType,
        organizationId: session.user.organizationId,
        uploadedByUserId: session.user.id,
        buffer,
        mimeType: detected.mimeType,
        ext: detected.ext,
      });

      return NextResponse.json({
        success: true,
        ...saved,
      });
    }

    // Case 2: JSON payload (base64 data URL or preset selection)
    const body = await req.json();
    const { base64Data, presetUrl, targetEmployeeId, targetUserId, employeeId, userId } = body;

    if (presetUrl) {
      return NextResponse.json({
        success: true,
        url: presetUrl,
      });
    }

    if (base64Data) {
      const folderResolution = await resolveTargetFolder(
        session,
        targetEmployeeId || employeeId,
        targetUserId || userId
      );
      if ('error' in folderResolution) {
        return NextResponse.json({ error: folderResolution.error }, { status: folderResolution.status });
      }

      const matches = String(base64Data).match(/^data:(image\/[A-Za-z0-9+.-]+);base64,(.+)$/);
      const rawBase64 = matches && matches.length === 3 ? matches[2] : String(base64Data);
      const buffer = Buffer.from(rawBase64, 'base64');

      if (buffer.length > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: 'Photo exceeds 4.5MB limit. Please upload a compressed portrait photo.' },
          { status: 400 }
        );
      }

      const detected = detectImageType(buffer);
      if (!detected) {
        return NextResponse.json(
          { error: 'Invalid image encoding. Only JPG, PNG, and WebP portrait photos are supported.' },
          { status: 400 }
        );
      }

      const saved = await saveProfilePhotoAsset({
        ownerId: folderResolution.ownerId,
        ownerType: folderResolution.ownerType,
        organizationId: session.user.organizationId,
        uploadedByUserId: session.user.id,
        buffer,
        mimeType: detected.mimeType,
        ext: detected.ext,
      });

      return NextResponse.json({
        success: true,
        ...saved,
      });
    }

    return NextResponse.json({ error: 'Invalid upload request. Image file or base64Data required.' }, { status: 400 });
  } catch (error: any) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
