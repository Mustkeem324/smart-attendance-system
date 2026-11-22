export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { completeShopVisit } from '@/lib/field-sales-engine';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { visitId, notes } = body;

    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 });
    }

    const visit = await completeShopVisit(visitId, notes);

    return NextResponse.json({
      success: true,
      message: 'Shop visit completed successfully.',
      visit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
