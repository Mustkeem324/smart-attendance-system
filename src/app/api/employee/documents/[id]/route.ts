export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { EmployeeDocumentRecord } from '@/models/employee-portal';
import { Role } from '@prisma/client';

const ELEVATED_HR: Role[] = [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const doc = await EmployeeDocumentRecord.findById(params.id).lean();
    if (!doc || doc.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const isElevated = requireRole(session.user.role, ELEVATED_HR);
    if (!isElevated && session.employee?.id !== doc.employeeId) {
      return NextResponse.json({ error: 'Forbidden: Private employee document' }, { status: 403 });
    }

    if (!doc.data) {
      return NextResponse.json({ error: 'Document file content missing' }, { status: 404 });
    }

    const buffer = Buffer.isBuffer(doc.data)
      ? doc.data
      : Buffer.from((doc.data as any).buffer || doc.data);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': doc.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${doc.fileName || 'document'}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to retrieve document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const doc = await EmployeeDocumentRecord.findById(params.id);
    if (!doc || doc.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const isElevated = requireRole(session.user.role, ELEVATED_HR);
    const isUploader = doc.employeeId === session.employee.id && doc.uploadedByUserId === session.user.id;
    if (!isElevated && !isUploader) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await EmployeeDocumentRecord.deleteOne({ _id: doc._id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
  }
}
