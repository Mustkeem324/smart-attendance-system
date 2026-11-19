import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { DeviceSerial, Product } from '@/models/electronics-sales';
import { addDeviceSerials } from '@/lib/electronics-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const productId = searchParams.get('productId');

    const query: any = {};
    if (status) query.stockStatus = status;
    if (productId) query.productId = productId;
    if (search) {
      query.$or = [
        { imei1: new RegExp(search, 'i') },
        { imei2: new RegExp(search, 'i') },
        { serialNumber: new RegExp(search, 'i') },
      ];
    }

    const devices = await DeviceSerial.find(query)
      .populate('productId')
      .populate('retailerId')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ success: true, count: devices.length, devices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { productId, devices, warehouseId } = body;

    if (!productId || !devices || !Array.isArray(devices) || devices.length === 0) {
      return NextResponse.json({ error: 'Product ID and an array of device IMEIs are required.' }, { status: 400 });
    }

    const added = await addDeviceSerials({ productId, devices, warehouseId });
    return NextResponse.json({ success: true, count: added.length, devices: added });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
