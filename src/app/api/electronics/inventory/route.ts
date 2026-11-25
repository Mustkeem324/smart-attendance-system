export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { hasAnyRole, ROLE_GROUPS } from '@/lib/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { Warehouse, Inventory, StockMovement, Product } from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAnyRole(session.user.role, ROLE_GROUPS.DISTRIBUTION_PORTAL)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const [warehouses, inventoryItems, recentMovements] = await Promise.all([
      Warehouse.find({ isActive: true }),
      Inventory.find().populate('productId').populate('warehouseId'),
      StockMovement.find().populate('productId').populate('warehouseId').sort({ createdAt: -1 }).limit(30),
    ]);

    const lowStockAlerts = inventoryItems.filter(
      (item) => item.onHandStock <= item.minimumThreshold
    );

    return NextResponse.json({
      success: true,
      warehouses,
      inventoryItems,
      lowStockAlerts,
      recentMovements,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
