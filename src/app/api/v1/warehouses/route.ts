export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Warehouse, Inventory } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const warehouses = await Warehouse.find({ isActive: true }).lean();

    // Calculate aggregated inventory stats per warehouse
    const warehousesWithStats = await Promise.all(
      warehouses.map(async (wh) => {
        const invs = await Inventory.find({ warehouseId: wh._id })
          .populate('productId', 'dealerPrice mrp')
          .lean();

        let totalSkus = invs.length;
        let totalUnits = 0;
        let totalValuation = 0;

        invs.forEach((inv: any) => {
          const u = inv.availableStock || 0;
          totalUnits += u;
          const price = inv.productId?.dealerPrice || 0;
          totalValuation += u * price;
        });

        return {
          ...wh,
          totalSkus,
          totalUnits,
          totalValuation,
        };
      })
    );

    return apiSuccess(warehousesWithStats);
  } catch (err: any) {
    console.error('V1 Warehouses GET Error:', err);
    return apiError(err.message || 'Failed to fetch warehouses', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, code, address, city, state } = body;

    if (!name || !code || !address || !city) {
      return apiError('Name, code, address and city are required', 400);
    }

    const warehouse = await Warehouse.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      address: address.trim(),
      city: city.trim(),
      state: state || 'Karnataka',
      isActive: true,
    });

    await logDistributionAction({
      action: 'WAREHOUSE_CREATED',
      userId: user.id,
      entityType: 'Warehouse',
      entityId: warehouse._id.toString(),
      details: { name: warehouse.name, code: warehouse.code, city: warehouse.city },
      req,
    });

    return apiSuccess(warehouse, undefined, 201);
  } catch (err: any) {
    console.error('V1 Warehouses POST Error:', err);
    return apiError(err.message || 'Failed to create warehouse', 500);
  }
}
