export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { Product } from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query) {
      return apiSuccess([]);
    }

    const filter: any = {
      status: 'ACTIVE',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { modelName: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { barcode: { $regex: query, $options: 'i' } },
      ],
    };

    const products = await Product.find(filter)
      .sort({ brand: 1, name: 1 })
      .limit(30)
      .lean();

    const formatted = products.map((p: any) => ({
      id: p._id,
      _id: p._id,
      name: p.name,
      brand: p.brand,
      model: p.modelName,
      sku: p.sku,
      barcode: p.barcode || p.sku,
      category: p.category,
      standardSellingPrice: p.dealerPrice,
      dealerPrice: p.dealerPrice,
      mrp: p.mrp,
      color: p.color || 'Standard',
      ram: p.ram || 'N/A',
      storage: p.storage || 'N/A',
      photograph: p.photograph,
      stockQuantity: p.stockQuantity ?? 25,
      requiresImei: Boolean(p.requiresImei),
      gstRatePercent: p.gstRatePercent || 18,
    }));

    return apiSuccess(formatted);
  } catch (err: any) {
    console.error('Products Search GET Error:', err);
    return apiError(err.message || 'Failed to search products', 500);
  }
}
