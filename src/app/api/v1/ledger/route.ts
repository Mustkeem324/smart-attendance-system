export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { RetailerLedger, Retailer } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const retailerId = searchParams.get('retailerId');
    const transactionType = searchParams.get('transactionType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (retailerId && retailerId !== 'ALL') filter.retailerId = retailerId;
    if (transactionType && transactionType !== 'ALL') filter.transactionType = transactionType;

    const [total, entries] = await Promise.all([
      RetailerLedger.countDocuments(filter),
      RetailerLedger.find(filter)
        .populate('retailerId', 'name ownerName phone dealerCode city state creditLimit outstandingBalance')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Financial totals in current view
    const summary = entries.reduce(
      (acc, entry) => {
        acc.totalDebit += entry.debitAmount || 0;
        acc.totalCredit += entry.creditAmount || 0;
        return acc;
      },
      { totalDebit: 0, totalCredit: 0 }
    );

    return apiSuccess(entries, {
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Ledger GET Error:', err);
    return apiError(err.message || 'Failed to fetch dealer ledger', 500);
  }
}
