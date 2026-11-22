export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateTokens } from '@/lib/auth';
import { logDistributionAction, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError('Email and password are required', 400);
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      include: {
        organization: true,
        employee: {
          include: {
            branch: true,
            department: true,
          },
        },
      },
    });

    if (!user) {
      return apiError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      return apiError('Account has been deactivated. Contact administration.', 403);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return apiError('Invalid email or password', 401);
    }

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.headers.get('x-forwarded-for') || '127.0.0.1',
        refreshToken,
      },
    });

    await logDistributionAction({
      action: 'USER_LOGIN',
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      req,
    });

    const response = apiSuccess({
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
        },
      },
    });

    // Set auth cookie
    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('V1 Auth Login Error:', err);
    return apiError(err.message || 'Internal server error during login', 500);
  }
}
