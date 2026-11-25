export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { hasAnyRole, ROLE_GROUPS } from '@/lib/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { Invoice } from '@/models/electronics-sales';
import { generateSalesInvoice } from '@/lib/electronics-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAnyRole(session.user.role, ROLE_GROUPS.DISTRIBUTION_PORTAL)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const retailerId = searchParams.get('retailerId');
    const isPaid = searchParams.get('isPaid');

    const query: any = {};
    if (retailerId) query.retailerId = retailerId;
    if (isPaid !== null && isPaid !== undefined) query.isPaid = isPaid === 'true';

    const invoices = await Invoice.find(query)
      .populate('retailerId')
      .sort({ invoiceDate: -1 });

    return NextResponse.json({ success: true, count: invoices.length, invoices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAnyRole(session.user.role, ROLE_GROUPS.INVENTORY_WRITE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const invoice = await generateSalesInvoice(body);
    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
