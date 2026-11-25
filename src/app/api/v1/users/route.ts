export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';
import { hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: any = { organizationId: user!.organizationId };
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              designation: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return apiSuccess(users, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Users GET Error:', err);
    return apiError(err.message || 'Failed to fetch users', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { email, password, role, employeeId } = body;

    if (!email || !password || !role) {
      return apiError('Email, password and role are required', 400);
    }

    const ALLOWED_ROLES = [
      'SUPER_ADMIN',
      'COMPANY_ADMIN',
      'HR_MANAGER',
      'TEAM_MANAGER',
      'EMPLOYEE',
      'SALES_MANAGER',
      'FIELD_SALES_REP',
      'DELIVERY_AGENT',
      'INVENTORY_MANAGER',
      'RETAILER',
      'DISTRIBUTOR',
    ];
    const normalizedRole = String(role).toUpperCase().trim();
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return apiError(`Invalid role specified: ${role}`, 400);
    }
    if (normalizedRole === 'SUPER_ADMIN' && user!.role !== 'SUPER_ADMIN') {
      return apiError('Only a Super Admin can provision another Super Admin account.', 403);
    }
    if (String(password).length < 6) {
      return apiError('Password must be at least 6 characters long.', 400);
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await prisma.user.findFirst({ where: { email: normalizedEmail } });
    if (existing) {
      return apiError('User with this email already exists', 409);
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: normalizedRole as any,
        organizationId: user!.organizationId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logDistributionAction({
      action: 'USER_CREATED',
      userId: user.id,
      entityType: 'User',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
      req,
    });

    return apiSuccess(newUser, undefined, 201);
  } catch (err: any) {
    console.error('V1 Users POST Error:', err);
    return apiError(err.message || 'Failed to create user', 500);
  }
}
