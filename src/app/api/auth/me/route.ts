import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: true,
        employee: {
          include: {
            department: true,
            branch: true,
            shift: true,
          },
        },
      },
    });

    if (!userWithDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: userWithDetails.id,
        email: userWithDetails.email,
        role: userWithDetails.role,
        organization: {
          id: userWithDetails.organization.id,
          name: userWithDetails.organization.name,
          code: userWithDetails.organization.code,
          settings: userWithDetails.organization.settings,
        },
        employee: userWithDetails.employee
          ? {
              id: userWithDetails.employee.id,
              employeeCode: userWithDetails.employee.employeeCode,
              firstName: userWithDetails.employee.firstName,
              lastName: userWithDetails.employee.lastName,
              designation: userWithDetails.employee.designation,
              department: userWithDetails.employee.department,
              branch: userWithDetails.employee.branch,
              shift: userWithDetails.employee.shift,
              profilePhoto: userWithDetails.employee.profilePhoto,
            }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
