export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const me = await prisma.employee.findUnique({
      where: { id: session.employee.id },
      include: {
        manager: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: true,
            email: true,
            profilePhoto: true,
            branch: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        subordinates: {
          where: { employmentStatus: 'ACTIVE' },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: true,
            email: true,
            profilePhoto: true,
            branch: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    });

    if (!me) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Department & branch colleagues (directory fields only — never expose private HR/financial records)
    const colleagues = await prisma.employee.findMany({
      where: {
        organizationId: session.user.organizationId,
        employmentStatus: 'ACTIVE',
        id: { not: me.id },
        OR: [{ departmentId: me.departmentId }, { branchId: me.branchId }],
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        designation: true,
        email: true,
        profilePhoto: true,
        departmentId: true,
        branch: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: [{ firstName: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      manager: me.manager || null,
      directReports: me.subordinates || [],
      departmentPeers: colleagues.filter((c) => c.departmentId === me.departmentId),
      branchColleagues: colleagues.filter((c) => c.departmentId !== me.departmentId),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load team directory' }, { status: 500 });
  }
}
