import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { organizationId } = session.user;
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

    const employees = await prisma.employee.findMany({
      where: { organizationId, employmentStatus: 'ACTIVE' },
      include: {
        department: true,
        branch: true,
        payrollRecords: {
          where: { month, year },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const payrollList = employees.map((emp) => {
      const pr = emp.payrollRecords[0];
      const baseSalary = emp.baseSalary || 50000;
      const netSalary = pr?.netSalary || baseSalary;

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department.name,
        branch: emp.branch.name,
        baseSalary,
        netSalary,
        status: pr?.status || 'PROCESSED',
        month,
        year,
      };
    });

    const totalDisbursed = payrollList.reduce((acc, p) => acc + p.netSalary, 0);

    return NextResponse.json({
      success: true,
      month,
      year,
      summary: {
        totalStaff: payrollList.length,
        totalDisbursed,
        currency: 'INR',
      },
      records: payrollList,
    });
  } catch (err: any) {
    console.error('Error in /api/payroll:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
