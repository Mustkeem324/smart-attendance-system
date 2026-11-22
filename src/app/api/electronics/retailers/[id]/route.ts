export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Retailer, ShopVisit, SalesOrder, Delivery, Invoice, PaymentCollection, RetailerLedger } from '@/models/electronics-sales';
import mongoose from 'mongoose';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const retailer = await Retailer.findById(params.id);
    if (!retailer) return NextResponse.json({ error: 'Retailer not found' }, { status: 404 });

    const objId = new mongoose.Types.ObjectId(params.id);

    const [visits, orders, deliveries, invoices, payments, ledger] = await Promise.all([
      ShopVisit.find({ retailerId: objId }).sort({ checkInTime: -1 }).limit(10),
      SalesOrder.find({ retailerId: objId }).sort({ orderDate: -1 }).limit(10),
      Delivery.find({ retailerId: objId }).sort({ deliveredAt: -1 }).limit(10),
      Invoice.find({ retailerId: objId }).sort({ invoiceDate: -1 }).limit(10),
      PaymentCollection.find({ retailerId: objId }).sort({ createdAt: -1 }).limit(10),
      RetailerLedger.find({ retailerId: objId }).sort({ date: -1 }).limit(20),
    ]);

    return NextResponse.json({
      success: true,
      retailer,
      visits,
      orders,
      deliveries,
      invoices,
      payments,
      ledger,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const body = await req.json();
    const updated = await Retailer.findByIdAndUpdate(params.id, body, { new: true });
    return NextResponse.json({ success: true, retailer: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
