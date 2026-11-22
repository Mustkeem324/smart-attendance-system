export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');

    const where: any = {
      organizationId: session.user.organizationId,
      isActive: true,
    };

    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          inventory: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.productCategory.findMany({
        where: { organizationId: session.user.organizationId, isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ success: true, count: products.length, products, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      name,
      sku,
      barcode,
      categoryId,
      brand,
      description,
      imageUrl,
      unitOfMeasure = 'Pieces',
      sellingPrice = 0,
      costPrice = 0,
      taxRatePercent = 0,
      initialStock = 100,
    } = body;

    if (!name || !sku) {
      return NextResponse.json({ error: 'Product name and SKU are required' }, { status: 400 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const createdProd = await tx.product.create({
        data: {
          organizationId: session.user.organizationId,
          name,
          sku: sku.toUpperCase().trim(),
          barcode: barcode || null,
          categoryId: categoryId || null,
          brand: brand || null,
          description: description || null,
          imageUrl: imageUrl || null,
          unitOfMeasure,
          sellingPrice: parseFloat(sellingPrice),
          costPrice: parseFloat(costPrice),
          taxRatePercent: parseFloat(taxRatePercent),
          isActive: true,
        },
      });

      // Default warehouse stock setup
      const defaultWh = await tx.warehouse.findFirst({
        where: { organizationId: session.user.organizationId, isActive: true },
      });

      let whId = defaultWh?.id;
      if (!whId) {
        const newWh = await tx.warehouse.create({
          data: {
            organizationId: session.user.organizationId,
            name: 'Central Distribution Warehouse',
            code: 'WH-MAIN',
            address: 'Industrial Area Sector 4',
            city: 'HQ City',
          },
        });
        whId = newWh.id;
      }

      await tx.inventory.create({
        data: {
          organizationId: session.user.organizationId,
          warehouseId: whId,
          productId: createdProd.id,
          currentStock: parseFloat(initialStock),
          allocatedStock: 0,
          minimumThreshold: 15,
          reorderQuantity: 50,
        },
      });

      return createdProd;
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
