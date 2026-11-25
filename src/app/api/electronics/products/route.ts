export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { hasAnyRole, ROLE_GROUPS } from '@/lib/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { Product, ProductCategory, Inventory } from '@/models/electronics-sales';
import { createProduct } from '@/lib/electronics-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');

    const query: any = { status: 'ACTIVE' };
    if (category) query.category = category;
    if (brand) query.brand = new RegExp(brand, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { modelName: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
      ];
    }

    const products = await Product.find(query).sort({ name: 1 });

    // Fetch live inventory for each product
    const productIds = products.map((p) => p._id);
    const inventories = await Inventory.find({ productId: { $in: productIds } });
    const invMap = new Map(inventories.map((inv) => [inv.productId.toString(), inv]));

    const enriched = products.map((p) => {
      const inv = invMap.get(p._id.toString());
      return {
        ...p.toObject(),
        onHandStock: inv?.onHandStock || 0,
        availableStock: inv?.availableStock || 0,
      };
    });

    const categories = await ProductCategory.find({ isActive: true });

    return NextResponse.json({
      success: true,
      count: enriched.length,
      products: enriched,
      categories,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAnyRole(session.user.role, ROLE_GROUPS.INVENTORY_WRITE)) {
      return NextResponse.json({ error: 'Forbidden: Inventory or Sales manager role required.' }, { status: 403 });
    }

    const body = await req.json();
    const product = await createProduct(body);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
