export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { hasAnyRole, ROLE_GROUPS } from '@/lib/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { ShopVisit } from '@/models/electronics-sales';
import { startShopVisit } from '@/lib/electronics-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAnyRole(session.user.role, ROLE_GROUPS.FIELD_SALES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    const query: any = {};
    if (date) query.visitDate = date;

    const visits = await ShopVisit.find(query)
      .populate('retailerId')
      .sort({ checkInTime: -1 });

    return NextResponse.json({ success: true, count: visits.length, visits });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAnyRole(session.user.role, ROLE_GROUPS.FIELD_SALES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const visit = await startShopVisit({
      ...body,
      employeeId: body.employeeId || session.user.id,
    });

    return NextResponse.json({ success: true, visit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
