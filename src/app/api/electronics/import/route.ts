import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { importActualElectronicsData } from '@/lib/electronics-sales-engine';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    let type = body.type;
    if (type === 'imei') type = 'imei_serials';

    const items = body.rows || body.retailers || body.products || body.deviceSerials;

    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Type (retailers, products, imei_serials) and non-empty rows array are required.' }, { status: 400 });
    }

    const report = await importActualElectronicsData(type, items);
    return NextResponse.json({ success: true, report, result: report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
