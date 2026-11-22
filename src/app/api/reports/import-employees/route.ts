export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { parseAndImportEmployees } from '@/lib/excel';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Excel file (.xlsx) is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await parseAndImportEmployees(buffer, session.user.organizationId);

    // Audit log
    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'BULK_IMPORT_EMPLOYEES',
      entity: 'Employee',
      newValues: {
        successCount: result.successCount,
        errorsCount: result.errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      importedCount: result.successCount,
      errors: result.errors,
      message: `Successfully imported ${result.successCount} employees with ${result.errors.length} row warning(s).`,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  }
}
