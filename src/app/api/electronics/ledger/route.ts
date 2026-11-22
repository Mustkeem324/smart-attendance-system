export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { RetailerLedger, Retailer } from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const retailerId = searchParams.get('retailerId');
    const transactionType = searchParams.get('transactionType');

    const query: any = {};
    if (retailerId) query.retailerId = retailerId;
    if (transactionType) query.transactionType = transactionType;

    const entries = await RetailerLedger.find(query)
      .populate('retailerId', 'shopName dealerCode ownerName phone gstin currentBalance creditLimit')
      .sort({ date: -1, createdAt: -1 })
      .limit(200);

    // Calculate aggregated metrics
    const totals = entries.reduce(
      (acc, cur) => {
        acc.totalDebit += cur.debitAmount || 0;
        acc.totalCredit += cur.creditAmount || 0;
        return acc;
      },
      { totalDebit: 0, totalCredit: 0 }
    );

    let retailerDetails = null;
    if (retailerId) {
      retailerDetails = await Retailer.findById(retailerId);
    }

    return NextResponse.json({
      success: true,
      count: entries.length,
      totals,
      retailerDetails,
      entries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
