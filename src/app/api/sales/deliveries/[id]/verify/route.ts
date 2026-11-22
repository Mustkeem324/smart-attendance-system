export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { processDeliveryVerification } from '@/lib/field-sales-engine';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.SALES_MANAGER as any,
      Role.HR_MANAGER,
    ]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { action, remarks, warehouseId } = body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Action must be APPROVE or REJECT' }, { status: 400 });
    }

    const verified = await processDeliveryVerification({
      deliveryId: params.id,
      reviewerUserId: session.user.id,
      action,
      remarks,
      warehouseId,
    });

    return NextResponse.json({
      success: true,
      message: action === 'APPROVE' ? 'Delivery verified and stock deducted.' : 'Delivery rejected.',
      delivery: verified,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
