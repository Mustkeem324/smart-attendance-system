import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-attendance-super-secure-jwt-secret-key-32-chars-min-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'smart-attendance-super-secure-refresh-jwt-secret-key-2026';

export interface TokenPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: Role;
  employeeId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId: payload.userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function getAuthSession(req: NextRequest): Promise<{
  user: {
    id: string;
    email: string;
    role: Role;
    organizationId: string;
  };
  employee: any | null;
} | null> {
  let token: string | undefined;

  // 1. Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Check cookies
  if (!token) {
    token = req.cookies.get('auth_token')?.value;
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      employee: {
        include: {
          branch: true,
          department: true,
          shift: true,
        },
      },
    },
  });

  if (!user || !user.isActive) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    employee: user.employee,
  };
}

export function requireRole(userRoleOrUser: Role | { role: Role }, allowedRoles: Role[]): boolean {
  const role = typeof userRoleOrUser === 'string' ? userRoleOrUser : userRoleOrUser?.role;
  return allowedRoles.includes(role);
}
