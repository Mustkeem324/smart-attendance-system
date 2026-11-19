import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from './auth';
import { connectToDatabase } from './mongodb';
import { SalesAuditLog } from '@/models/electronics-sales';

export interface ApiUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  name?: string;
}

export async function authenticateApi(req: NextRequest, allowedRoles?: string[]): Promise<{
  user: ApiUser;
  errorResponse?: NextResponse;
}> {
  await connectToDatabase();
  const session = await getAuthSession(req);

  if (!session || !session.user) {
    return {
      user: null as any,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized. Valid bearer token or authentication cookie required.' },
        { status: 401 }
      )
    };
  }

  const role = session.user.role;
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role) && role !== 'SUPER_ADMIN' && role !== 'COMPANY_ADMIN') {
    return {
      user: null as any,
      errorResponse: NextResponse.json(
        { success: false, error: `Forbidden. Role '${role}' not authorized for this resource.` },
        { status: 403 }
      )
    };
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      organizationId: session.user.organizationId,
      name: session.employee ? `${session.employee.firstName} ${session.employee.lastName}` : session.user.email
    }
  };
}

export async function logDistributionAction({
  action,
  userId,
  entityType,
  entityId,
  details,
  req
}: {
  action: string;
  userId?: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  req?: NextRequest;
}) {
  try {
    await connectToDatabase();
    const ipAddress = req?.headers.get('x-forwarded-for') || '127.0.0.1';
    await SalesAuditLog.create({
      action,
      userId: userId || 'system',
      entityType,
      entityId,
      details,
      ipAddress
    });
  } catch (err) {
    console.error('Failed to write SalesAuditLog:', err);
  }
}

export function apiSuccess(data: any, meta?: Record<string, any>, status = 200) {
  return NextResponse.json({ success: true, data, ...meta }, { status });
}

export function apiError(message: string, status = 400, details?: any) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}
