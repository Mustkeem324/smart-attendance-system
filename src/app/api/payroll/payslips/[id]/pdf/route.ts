export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePayslipPDF } from '@/lib/payroll-engine';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payslip = await prisma.payslip.findUnique({
      where: { id: params.id },
    });

    if (!payslip || payslip.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
    }

    // Role check: employees can only view their own payslips
    const isElevated = [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER].includes(session.user.role as any);
    if (!isElevated && session.employee?.id !== payslip.employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pdfBuffer = await generatePayslipPDF(params.id);

    return new Response(Buffer.from(pdfBuffer) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Payslip_${payslip.payslipNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
