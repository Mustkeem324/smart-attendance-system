export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StockMovementType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [warehouses, inventoryItems, recentMovements] = await Promise.all([
      prisma.warehouse.findMany({
        where: { organizationId: session.user.organizationId, isActive: true },
        include: {
          _count: { select: { inventory: true } },
        },
      }),
      prisma.inventory.findMany({
        where: { organizationId: session.user.organizationId },
        include: {
          product: { include: { category: true } },
          warehouse: true,
        },
        orderBy: { currentStock: 'asc' },
      }),
      prisma.stockMovement.findMany({
        where: { organizationId: session.user.organizationId },
        include: {
          product: true,
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const lowStockAlerts = inventoryItems.filter((item) => item.currentStock <= item.minimumThreshold);

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

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { warehouseId, productId, movementType, quantity, notes } = body;

    if (!warehouseId || !productId || !movementType || quantity === undefined || quantity <= 0) {
      return NextResponse.json({ error: 'Warehouse, product, movement type and positive quantity are required' }, { status: 400 });
    }

    const qty = parseFloat(quantity);
    const type = movementType as StockMovementType;

    const result = await prisma.$transaction(async (tx) => {
      // Determine delta
      let delta = 0;
      if (type === 'INWARD' || type === 'RETURN_IN') {
        delta = qty;
      } else if (type === 'DELIVERY_OUT' || type === 'DAMAGE_OUT') {
        delta = -qty;
      } else if (type === 'ADJUSTMENT') {
        delta = qty; // can be positive or negative
      }

      const inv = await tx.inventory.upsert({
        where: {
          warehouseId_productId: { warehouseId, productId },
        },
        update: {
          currentStock: { increment: delta },
        },
        create: {
          organizationId: session.user.organizationId,
          warehouseId,
          productId,
          currentStock: delta,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          organizationId: session.user.organizationId,
          warehouseId,
          productId,
          movementType: type,
          quantity: qty,
          balanceAfter: inv.currentStock,
          notes: notes || `Manual stock adjustment (${type})`,
          performedByUserId: session.user.id,
        },
      });

      return { inv, movement };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
