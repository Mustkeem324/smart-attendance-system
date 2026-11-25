export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import { EmployeeDocumentRecord } from '@/models/employee-portal';
import { Role } from '@prisma/client';

const ELEVATED_HR: Role[] = [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER];
const MAX_DOC_BYTES = 4.5 * 1024 * 1024;
const ALLOWED_DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function validateDocMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  if (!buffer || buffer.length < 4) return false;
  if (declaredMime === 'application/pdf') {
    return buffer.subarray(0, 4).toString('ascii') === '%PDF';
  }
  if (declaredMime === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (declaredMime === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (declaredMime === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedEmpId = searchParams.get('employeeId');
    const isElevated = requireRole(session.user.role, ELEVATED_HR);

    // Strictly prevent one employee from reading another employee's private documents
    if (requestedEmpId && requestedEmpId !== session.employee.id && !isElevated) {
      return NextResponse.json({ error: 'Forbidden: Cannot access private documents of another employee.' }, { status: 403 });
    }

    const targetEmployeeId = isElevated && requestedEmpId ? requestedEmpId : session.employee.id;

    await connectToDatabase();
    const [payslips, docs] = await Promise.all([
      prisma.payslip.findMany({
        where: { organizationId: session.user.organizationId, employeeId: targetEmployeeId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      EmployeeDocumentRecord.find({
        organizationId: session.user.organizationId,
        employeeId: targetEmployeeId,
      })
        .select('-data')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      payslips: payslips.map((p) => ({
        id: p.id,
        payslipNumber: p.payslipNumber,
        month: p.month,
        year: p.year,
        netSalary: p.netSalary,
        downloadUrl: `/api/payroll/payslips/${p.id}/pdf`,
      })),
      documents: docs.map((d: any) => ({
        id: String(d._id),
        title: d.title,
        category: d.category,
        fileName: d.fileName,
        mimeType: d.mimeType,
        size: d.size,
        uploadedByName: d.uploadedByName,
        createdAt: d.createdAt,
        downloadUrl: `/api/employee/documents/${d._id}`,
      })),
      appointmentLetterUrl: '/api/employee/documents/appointment-letter',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = String(formData.get('title') || '').trim();
    const category = String(formData.get('category') || 'EMPLOYMENT').toUpperCase();
    const targetEmpId = formData.get('employeeId') as string | null;

    if (!file || !title) {
      return NextResponse.json({ error: 'Document title and file are required' }, { status: 400 });
    }

    const isElevated = requireRole(session.user.role, ELEVATED_HR);
    let assignEmployeeId = session.employee.id;
    if (targetEmpId && targetEmpId !== session.employee.id) {
      if (!isElevated) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const emp = await prisma.employee.findUnique({
        where: { id: targetEmpId },
        select: { id: true, organizationId: true },
      });
      if (!emp || emp.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      assignEmployeeId = emp.id;
    }

    if (!ALLOWED_DOC_MIMES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported document format. Use PDF, JPG, PNG, or WebP.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_DOC_BYTES) {
      return NextResponse.json({ error: 'Document file exceeds 4.5MB limit' }, { status: 400 });
    }

    if (!validateDocMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: 'Invalid file contents for selected format.' }, { status: 400 });
    }

    type DocCategory = 'APPOINTMENT_LETTER' | 'EMPLOYMENT' | 'ID_PROOF' | 'TAX' | 'POLICY' | 'OTHER';
    const ALLOWED_CATEGORIES: DocCategory[] = ['APPOINTMENT_LETTER', 'EMPLOYMENT', 'ID_PROOF', 'TAX', 'POLICY', 'OTHER'];
    const validCategory: DocCategory = ALLOWED_CATEGORIES.includes(category as DocCategory)
      ? (category as DocCategory)
      : 'EMPLOYMENT';

    await connectToDatabase();
    const created = await EmployeeDocumentRecord.create({
      organizationId: session.user.organizationId,
      employeeId: assignEmployeeId,
      title,
      category: validCategory,
      fileName: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
      mimeType: file.type,
      size: buffer.length,
      data: buffer,
      uploadedByUserId: session.user.id,
      uploadedByName: `${session.employee.firstName} ${session.employee.lastName}`,
    });

    return NextResponse.json(
      {
        success: true,
        document: {
          id: String(created._id),
          title: created.title,
          category: created.category,
          fileName: created.fileName,
          mimeType: created.mimeType,
          size: created.size,
          uploadedByName: created.uploadedByName,
          createdAt: created.createdAt,
          downloadUrl: `/api/employee/documents/${created._id}`,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Document upload failed' }, { status: 500 });
  }
}
