export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Invoice } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const invoice = await Invoice.findById(params.id)
      .populate('retailerId')
      .populate('orderId')
      .lean();

    if (!invoice) return apiError('Invoice not found', 404);

    return apiSuccess(invoice);
  } catch (err: any) {
    console.error('V1 Invoices [id] GET Error:', err);
    return apiError(err.message || 'Failed to fetch invoice', 500);
  }
}
