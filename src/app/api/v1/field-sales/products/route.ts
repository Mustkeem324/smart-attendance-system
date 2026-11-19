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
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const filter: any = { status: 'ACTIVE' };
    if (category && category !== 'ALL') filter.category = category;
    if (brand && brand !== 'ALL') filter.brand = brand;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { modelName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ brand: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Format products with explicit standard selling price
    const formatted = products.map((p: any) => ({
      id: p._id,
      _id: p._id,
      name: p.name,
      brand: p.brand,
      model: p.modelName,
      sku: p.sku,
      barcode: p.barcode || p.sku,
      category: p.category,
      standardSellingPrice: p.dealerPrice, // Predefined standard commercial wholesale selling price
      dealerPrice: p.dealerPrice,
      mrp: p.mrp,
      retailSellingPrice: p.retailSellingPrice || p.mrp,
      color: p.color || 'Standard',
      availableColors: p.availableColors || (p.color ? [p.color] : []),
      ram: p.ram || 'N/A',
      storage: p.storage || 'N/A',
      photograph: p.photograph || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
      stockQuantity: p.stockQuantity ?? 25,
      stockStatus: p.stockStatus || 'IN_STOCK',
      requiresImei: Boolean(p.requiresImei),
      gstRatePercent: p.gstRatePercent || 18,
      hsnCode: p.hsnCode || '85171200',
    }));

    return apiSuccess(formatted, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Field Sales Products GET Error:', err);
    return apiError(err.message || 'Failed to fetch catalog products', 500);
  }
}
