import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Retailer, SalesOrder, Invoice, RetailerLedger, PaymentCollection, ShopVisit } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const retailer = await Retailer.findById(params.id).lean();
    if (!retailer) return apiError('Retailer not found', 404);

    const [orders, invoices, ledgerEntries, payments, visits] = await Promise.all([
      SalesOrder.find({ retailerId: retailer._id }).sort({ createdAt: -1 }).limit(10).lean(),
      Invoice.find({ retailerId: retailer._id }).sort({ createdAt: -1 }).limit(10).lean(),
      RetailerLedger.find({ retailerId: retailer._id }).sort({ createdAt: -1 }).limit(15).lean(),
      PaymentCollection.find({ retailerId: retailer._id }).sort({ createdAt: -1 }).limit(10).lean(),
      ShopVisit.find({ retailerId: retailer._id }).sort({ checkInTime: -1 }).limit(10).lean(),
    ]);

    return apiSuccess({
      retailer,
      orders,
      invoices,
      ledgerEntries,
      payments,
      visits,
    });
  } catch (err: any) {
    console.error('V1 Retailers [id] GET Error:', err);
    return apiError(err.message || 'Failed to fetch retailer 360 profile', 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();

    const updated = await Retailer.findByIdAndUpdate(params.id, { $set: body }, { new: true });
    if (!updated) return apiError('Retailer not found', 404);

    await logDistributionAction({
      action: 'RETAILER_UPDATED',
      userId: user.id,
      entityType: 'Retailer',
      entityId: updated._id.toString(),
      details: body,
      req,
    });

    return apiSuccess(updated);
  } catch (err: any) {
    console.error('V1 Retailers [id] PUT Error:', err);
    return apiError(err.message || 'Failed to update retailer', 500);
  }
}
