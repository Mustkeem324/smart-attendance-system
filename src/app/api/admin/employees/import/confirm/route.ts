export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
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

    const body = await req.json();
    const { validRows } = body;

    if (!validRows || !Array.isArray(validRows) || validRows.length === 0) {
      return NextResponse.json({ error: 'validRows array is required' }, { status: 400 });
    }

    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
    const leaveTypes = await prisma.leaveType.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
    });

    const currentYear = new Date().getFullYear();
    const createdEmployees: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        // 1. Create User
        const user = await tx.user.create({
          data: {
            organizationId: session.user.organizationId,
            email: row.email.toLowerCase(),
            passwordHash: defaultPasswordHash,
            role: Role.EMPLOYEE,
            isActive: true,
          },
        });

        // 2. Create Employee
        const emp = await tx.employee.create({
          data: {
            organizationId: session.user.organizationId,
            userId: user.id,
            employeeCode: row.employeeCode,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email.toLowerCase(),
            phone: row.phone || null,
            designation: row.designation,
            departmentId: row.departmentId,
            branchId: row.branchId,
            shiftId: row.shiftId || null,
            joiningDate: new Date(row.joiningDate),
            employmentType: row.employmentType || 'FULL_TIME',
            weeklyOff: row.weeklyOff || 'SUNDAY',
            baseSalary: row.baseSalary || 35000,
            employmentStatus: 'ACTIVE',
          },
        });

        // 3. Initialize Leave Balances
        for (const lt of leaveTypes) {
          await tx.leaveBalance.create({
            data: {
              employeeId: emp.id,
              leaveTypeId: lt.id,
              year: currentYear,
              totalQuota: lt.maxDaysPerYear,
              usedDays: 0,
              pendingDays: 0,
              remainingDays: lt.maxDaysPerYear,
            },
          });
        }

        createdEmployees.push(emp);
      }
    });

    return NextResponse.json({
      success: true,
      importedCount: createdEmployees.length,
      employees: createdEmployees.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
