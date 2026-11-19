import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let holidayRows: { name: string; date: string; description?: string; isOptional?: boolean }[] = [];
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      holidayRows = body.holidays || [];
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const name = String(row.getCell(1).value || '').trim();
        const dateVal = row.getCell(2).value;
        const desc = String(row.getCell(3).value || '').trim();

        let dateStr = '';
        if (dateVal instanceof Date) {
          dateStr = dateVal.toISOString().split('T')[0];
        } else if (typeof dateVal === 'string') {
          dateStr = dateVal.trim();
        }

        if (name && dateStr) {
          holidayRows.push({ name, date: dateStr, description: desc });
        }
      });
    }

    if (holidayRows.length === 0) {
      return NextResponse.json({ error: 'No valid holiday rows found' }, { status: 400 });
    }

    const created: any[] = [];
    await prisma.$transaction(async (tx) => {
      for (const h of holidayRows) {
        const item = await tx.holiday.upsert({
          where: {
            organizationId_date_name: {
              organizationId: session.user.organizationId,
              date: h.date,
              name: h.name,
            },
          },
          update: {
            description: h.description,
            isOptional: !!h.isOptional,
          },
          create: {
            organizationId: session.user.organizationId,
            name: h.name,
            date: h.date,
            description: h.description,
            isOptional: !!h.isOptional,
          },
        });
        created.push(item);
      }
    });

    return NextResponse.json({
      success: true,
      importedCount: created.length,
      holidays: created,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
