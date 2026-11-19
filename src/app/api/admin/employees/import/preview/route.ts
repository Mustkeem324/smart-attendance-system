import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { validateEmployeeImportRows } from '@/lib/excel-advanced';
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

    let rawRows: any[] = [];
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      rawRows = body.rows || [];
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No Excel file uploaded' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return NextResponse.json({ error: 'No worksheet found in Excel file' }, { status: 400 });
      }

      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, colNum) => {
        headers[colNum] = String(cell.value || '').trim();
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNum) => {
          const header = headers[colNum];
          if (header) {
            rowData[header] = cell.value;
          }
        });
        if (Object.keys(rowData).length > 0) {
          rawRows.push(rowData);
        }
      });
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'No data rows detected in the upload.' }, { status: 400 });
    }

    const { validRows, invalidRows } = await validateEmployeeImportRows(rawRows, session.user.organizationId);

    return NextResponse.json({
      success: true,
      totalRows: rawRows.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      validRows,
      invalidRows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
