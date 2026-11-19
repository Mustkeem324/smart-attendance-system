import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Inventory, Product, Warehouse, StockMovement } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (warehouseId && warehouseId !== 'ALL') filter.warehouseId = warehouseId;

    const inventories = await Inventory.find(filter)
      .populate('warehouseId', 'name code city state')
      .populate({
        path: 'productId',
        select: 'name brand sku category mrp dealerPrice stockQuantity stockStatus requiresImei photograph',
      })
      .sort({ availableStock: 1 })
      .lean();

    // Filter by search / lowStock in memory or join
    let filtered = inventories.filter((inv: any) => inv.productId);
    if (lowStockOnly) {
      filtered = filtered.filter((inv: any) => inv.availableStock <= (inv.minimumThreshold || 10));
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (inv: any) =>
          inv.productId?.name?.toLowerCase().includes(s) ||
          inv.productId?.sku?.toLowerCase().includes(s) ||
          inv.productId?.brand?.toLowerCase().includes(s)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return apiSuccess(paginated, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Inventory GET Error:', err);
    return apiError(err.message || 'Failed to fetch inventory', 500);
  }
}
