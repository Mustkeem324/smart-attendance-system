import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role, EmploymentType, EmploymentStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const departmentId = searchParams.get('departmentId');
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: session.user.organizationId,
    };

    if (search) {
      where.OR = [
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (departmentId) where.departmentId = departmentId;
    if (branchId) where.branchId = branchId;
    if (status) where.employmentStatus = status as EmploymentStatus;

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        include: {
          department: true,
          branch: true,
          shift: true,
          manager: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
          user: {
            select: { id: true, role: true, isActive: true, lastLoginAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      employees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to add employees' }, { status: 403 });
    }

    const body = await req.json();
    const {
      employeeCode,
      firstName,
      lastName,
      email,
      phone,
      address,
      emergencyContact,
      designation,
      departmentId,
      branchId,
      shiftId,
      managerId,
      joiningDate,
      employmentType = 'FULL_TIME',
      weeklyOff = 'SUNDAY',
      baseSalary = 0,
      role = 'EMPLOYEE',
      password = 'Password@123',
    } = body;

    if (!employeeCode || !firstName || !lastName || !email || !departmentId || !branchId || !shiftId) {
      return NextResponse.json({ error: 'Missing mandatory fields' }, { status: 400 });
    }

    // Check duplicate code
    const existingEmp = await prisma.employee.findUnique({
      where: {
        organizationId_employeeCode: {
          organizationId: session.user.organizationId,
          employeeCode,
        },
      },
    });

    if (existingEmp) {
      return NextResponse.json({ error: `Employee code '${employeeCode}' already exists.` }, { status: 409 });
    }

    // Create User login account
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        organizationId: session.user.organizationId,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role as Role,
      },
    });

    // Create Employee record
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        organizationId: session.user.organizationId,
        employeeCode,
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        phone,
        address,
        emergencyContact,
        designation,
        departmentId,
        branchId,
        shiftId,
        managerId: managerId || null,
        joiningDate: new Date(joiningDate || new Date()),
        employmentType: employmentType as EmploymentType,
        employmentStatus: EmploymentStatus.ACTIVE,
        weeklyOff,
        baseSalary: Number(baseSalary) || 0,
      },
      include: {
        department: true,
        branch: true,
        shift: true,
      },
    });

    // Initialize Leave Balances
    const currentYear = new Date().getFullYear();
    const leaveTypes = await prisma.leaveType.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
    });

    for (const lt of leaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          leaveTypeId: lt.id,
          year: currentYear,
          totalQuota: lt.maxDaysPerYear,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: lt.maxDaysPerYear,
        },
      });
    }

    // Audit Log
    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'CREATE_EMPLOYEE',
      entity: 'Employee',
      entityId: employee.id,
      newValues: { employeeCode, name: `${firstName} ${lastName}`, email, designation },
    });

    return NextResponse.json({
      success: true,
      message: 'Employee registered successfully',
      employee,
    });
  } catch (error: any) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create employee' }, { status: 500 });
  }
}
