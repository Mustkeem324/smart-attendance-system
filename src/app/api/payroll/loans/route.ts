export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isElevated = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);

    const where: any = { organizationId: session.user.organizationId };
    if (!isElevated && session.employee) {
      where.employeeId = session.employee.id;
    }

    const loans = await prisma.employeeLoan.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, loans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const body = await req.json();
    const { employeeId, principalAmount, tenureMonths, interestRate = 0 } = body;

    if (!employeeId || !principalAmount || !tenureMonths) {
      return NextResponse.json({ error: 'Employee ID, principal amount, and tenure in months are required' }, { status: 400 });
    }

    const principal = parseFloat(principalAmount);
    const months = parseInt(tenureMonths, 10);
    const monthlyInstallment = parseFloat((principal / months).toFixed(2));

    const loan = await prisma.$transaction(async (tx) => {
      const createdLoan = await tx.employeeLoan.create({
        data: {
          organizationId: session.user.organizationId,
          employeeId,
          principalAmount: principal,
          interestRate: parseFloat(interestRate),
          tenureMonths: months,
          monthlyInstallment,
          outstandingBalance: principal,
          status: 'ACTIVE',
        },
      });

      // Create installment schedules
      for (let i = 1; i <= months; i++) {
        await tx.loanInstallment.create({
          data: {
            employeeLoanId: createdLoan.id,
            installmentNumber: i,
            amount: monthlyInstallment,
            status: 'PENDING',
          },
        });
      }

      return createdLoan;
    });

    return NextResponse.json({ success: true, loan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
