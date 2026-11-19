import { NextRequest, NextResponse } from 'next/server';
import { generateEmployeeImportTemplate } from '@/lib/excel';

export async function GET(req: NextRequest) {
  try {
    const buffer = await generateEmployeeImportTemplate();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Employee_Import_Template.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
