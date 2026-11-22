export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Inventory, StockMovement, Product } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INVENTORY_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { warehouseId, productId, adjustmentType, quantity, notes } = body;

    const qty = parseInt(quantity);
    if (!warehouseId || !productId || !adjustmentType || isNaN(qty) || qty === 0) {
      return apiError('warehouseId, productId, adjustmentType and non-zero quantity are required', 400);
    }

    const inv = await Inventory.findOne({ warehouseId, productId });
    if (!inv && qty < 0) {
      return apiError('Cannot deduct stock from non-existent inventory', 400);
    }

    const currentStock = inv?.availableStock || 0;
    const newStock = currentStock + qty;
    if (newStock < 0) {
      return apiError(`Cannot adjust stock below zero. Current stock: ${currentStock}`, 400);
    }

    const updatedInv = await Inventory.findOneAndUpdate(
      { warehouseId, productId },
      {
        $inc: { availableStock: qty, onHandStock: qty },
        $setOnInsert: { allocatedStock: 0, minimumThreshold: 10, reorderQuantity: 25 },
      },
      { upsert: true, new: true }
    );

    // Update product overall stock quantity and status
    const allWarehouseStock = await Inventory.aggregate([
      { $match: { productId: updatedInv.productId } },
      { $group: { _id: null, total: { $sum: '$availableStock' } } },
    ]);
    const overall = allWarehouseStock[0]?.total || 0;
    const stockStatus = overall > 10 ? 'IN_STOCK' : overall > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK';

    await Product.findByIdAndUpdate(productId, {
      stockQuantity: overall,
      stockStatus,
    });

    const refId = `ADJ-${Date.now().toString().slice(-6)}`;
    await StockMovement.create({
      warehouseId,
      productId,
      movementType: adjustmentType === 'PURCHASE_INWARD' ? 'PURCHASE_INWARD' : 'STOCK_ADJUSTMENT',
      quantity: qty,
      balanceAfter: updatedInv.availableStock,
      referenceId: refId,
      performedBy: user.email,
      notes,
    });

    await logDistributionAction({
      action: 'STOCK_ADJUSTED',
      userId: user.id,
      entityType: 'Inventory',
      entityId: productId,
      details: { warehouseId, quantity: qty, adjustmentType, newStock: updatedInv.availableStock },
      req,
    });

    return apiSuccess({
      message: 'Stock adjusted successfully',
      referenceId: refId,
      availableStock: updatedInv.availableStock,
      totalProductStock: overall,
    });
  } catch (err: any) {
    console.error('V1 Inventory Adjust Error:', err);
    return apiError(err.message || 'Failed to adjust stock', 500);
  }
}
