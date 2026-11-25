export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Product } from '@/models/electronics-sales';

export async function GET() {
  try {
    await connectToDatabase();
    const count = await Product.countDocuments({ status: 'ACTIVE' });
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error('Catalog Count Error:', error);
    return NextResponse.json({ success: false, count: 0, error: 'Failed to load catalog count' }, { status: 500 });
  }
}
