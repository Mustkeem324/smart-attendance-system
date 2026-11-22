export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SalesAuditLog } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (action && action !== 'ALL') filter.action = action;
    if (entityType && entityType !== 'ALL') filter.entityType = entityType;

    const [total, logs] = await Promise.all([
      SalesAuditLog.countDocuments(filter),
      SalesAuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return apiSuccess(logs, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Audit Logs GET Error:', err);
    return apiError(err.message || 'Failed to fetch audit logs', 500);
  }
}
