import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Retailer } from '@/models/electronics-sales';
import { createRetailer } from '@/lib/electronics-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const city = searchParams.get('city');

    const query: any = { status: 'ACTIVE' };
    if (category) query.shopCategory = category;
    if (city) query.city = new RegExp(city, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { ownerName: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { dealerCode: new RegExp(search, 'i') },
        { area: new RegExp(search, 'i') },
      ];
    }

    const retailers = await Retailer.find(query).sort({ name: 1 });
    return NextResponse.json({ success: true, count: retailers.length, retailers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const retailer = await createRetailer(body);
    return NextResponse.json({ success: true, retailer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
