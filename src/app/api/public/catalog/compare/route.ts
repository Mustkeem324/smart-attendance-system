export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Product } from '@/models/electronics-sales';
import { getAuthSession } from '@/lib/auth';

function checkDealerAccess(session: any): boolean {
  if (!session || !session.user) return false;
  const role = session.user.role;
  const authorizedRoles = [
    'SUPER_ADMIN',
    'COMPANY_ADMIN',
    'HR_MANAGER',
    'TEAM_MANAGER',
    'SALES_MANAGER',
    'FIELD_SALES_REP',
    'INVENTORY_MANAGER',
  ];
  if (authorizedRoles.includes(role)) return true;
  if (role === 'EMPLOYEE') {
    const email = session.user.email?.toLowerCase() || '';
    const designation = session.employee?.designation?.toLowerCase() || '';
    if (email.includes('dealer') || designation.includes('dealer') || designation.includes('retailer')) {
      return true;
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getAuthSession(req);
    const hasDealerAccess = checkDealerAccess(session);

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids') || '';
    const idList = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .slice(0, 4);

    if (idList.length === 0) {
      return NextResponse.json({ success: true, products: [] });
    }

    const rawProducts = await Product.find({ _id: { $in: idList } }).lean();

    const products = rawProducts.map((p: any) => ({
      _id: p._id.toString(),
      name: p.name,
      brand: p.brand,
      modelName: p.modelName,
      sku: p.sku,
      category: p.category,
      photograph: p.photograph,
      color: p.color,
      ram: p.ram || 'N/A',
      storage: p.storage || 'N/A',
      processor: p.processor || 'N/A',
      screenSize: p.screenSize || 'N/A',
      displaySpecs: p.displaySpecs || 'N/A',
      batterySpecs: p.batterySpecs || 'N/A',
      connectivity: p.connectivity || 'N/A',
      warrantyPeriodMonths: `${p.warrantyPeriodMonths || 12} Months`,
      mrp: p.mrp,
      retailSellingPrice: p.retailSellingPrice || p.mrp,
      dealerPrice: hasDealerAccess ? p.dealerPrice : null,
      stockStatus: p.stockStatus || 'IN_STOCK',
      hsnCode: p.hsnCode || '85171200',
    }));

    return NextResponse.json({
      success: true,
      count: products.length,
      isDealerAuthorized: hasDealerAccess,
      products,
    });
  } catch (error: any) {
    console.error('Error fetching comparison products:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch comparison products' },
      { status: 500 }
    );
  }
}
