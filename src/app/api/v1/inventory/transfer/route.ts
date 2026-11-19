import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Inventory, StockMovement, Product, Warehouse } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INVENTORY_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { fromWarehouseId, toWarehouseId, productId, quantity, notes } = body;

    const qty = parseInt(quantity);
    if (!fromWarehouseId || !toWarehouseId || !productId || !qty || qty <= 0) {
      return apiError('fromWarehouseId, toWarehouseId, productId and positive quantity are required', 400);
    }

    if (fromWarehouseId === toWarehouseId) {
      return apiError('Source and destination warehouses must be different', 400);
    }

    // Check source stock
    const sourceInv = await Inventory.findOne({ warehouseId: fromWarehouseId, productId });
    if (!sourceInv || sourceInv.availableStock < qty) {
      return apiError(`Insufficient available stock at source hub. Available: ${sourceInv?.availableStock || 0}`, 400);
    }

    // Deduct from source
    sourceInv.availableStock -= qty;
    sourceInv.onHandStock -= qty;
    await sourceInv.save();

    // Add to destination
    const destInv = await Inventory.findOneAndUpdate(
      { warehouseId: toWarehouseId, productId },
      {
        $inc: { availableStock: qty, onHandStock: qty },
        $setOnInsert: { allocatedStock: 0, minimumThreshold: 10, reorderQuantity: 25 },
      },
      { upsert: true, new: true }
    );

    // Record StockMovement for both sides
    const refId = `TRF-${Date.now().toString().slice(-6)}`;
    await StockMovement.create([
      {
        warehouseId: fromWarehouseId,
        productId,
        movementType: 'STOCK_TRANSFER',
        quantity: -qty,
        balanceAfter: sourceInv.availableStock,
        referenceId: refId,
        performedBy: user.email,
        notes: `Transfer Out to ${toWarehouseId}: ${notes || ''}`,
      },
      {
        warehouseId: toWarehouseId,
        productId,
        movementType: 'STOCK_TRANSFER',
        quantity: qty,
        balanceAfter: destInv.availableStock,
        referenceId: refId,
        performedBy: user.email,
        notes: `Transfer In from ${fromWarehouseId}: ${notes || ''}`,
      },
    ]);

    await logDistributionAction({
      action: 'STOCK_TRANSFERRED',
      userId: user.id,
      entityType: 'Inventory',
      entityId: productId,
      details: { fromWarehouseId, toWarehouseId, quantity: qty, referenceId: refId },
      req,
    });

    return apiSuccess({
      message: `Transferred ${qty} units successfully`,
      referenceId: refId,
      sourceBalance: sourceInv.availableStock,
      destinationBalance: destInv.availableStock,
    });
  } catch (err: any) {
    console.error('V1 Inventory Transfer Error:', err);
    return apiError(err.message || 'Failed to complete stock transfer', 500);
  }
}
