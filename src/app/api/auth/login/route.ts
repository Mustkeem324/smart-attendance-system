export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateTokens } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      include: {
        organization: true,
        employee: {
          include: {
            branch: true,
            department: true,
            shift: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated. Contact administrator.' }, { status: 403 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.headers.get('x-forwarded-for') || '127.0.0.1',
        refreshToken,
      },
    });

    // Audit log
    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'Browser',
    });

    const response = NextResponse.json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          code: user.organization.code,
        },
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeCode: user.employee.employeeCode,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              designation: user.employee.designation,
              department: user.employee.department.name,
              branch: {
                id: user.employee.branch.id,
                name: user.employee.branch.name,
                latitude: user.employee.branch.latitude,
                longitude: user.employee.branch.longitude,
                radiusMeters: user.employee.branch.radiusMeters,
              },
              shift: {
                id: user.employee.shift.id,
                name: user.employee.shift.name,
                startTime: user.employee.shift.startTime,
                endTime: user.employee.shift.endTime,
                gracePeriodMinutes: user.employee.shift.gracePeriodMinutes,
              },
            }
          : null,
      },
    });

    // Set HTTP-Only Cookie
    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
