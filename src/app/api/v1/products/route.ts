import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Product, Inventory, Warehouse } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const stockStatus = searchParams.get('stockStatus');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const filter: any = { status: 'ACTIVE' };
    if (category && category !== 'ALL') filter.category = category;
    if (brand && brand !== 'ALL') filter.brand = brand;
    if (stockStatus && stockStatus !== 'ALL') filter.stockStatus = stockStatus;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { modelName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return apiSuccess(products, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Products GET Error:', err);
    return apiError(err.message || 'Failed to fetch products', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INVENTORY_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      name,
      brand,
      modelName,
      sku,
      category,
      mrp,
      dealerPrice,
      retailSellingPrice,
      stockQuantity = 20,
      requiresImei = false,
      hsnCode = '85171200',
      description,
      photograph,
      color,
      ram,
      storage,
      processor,
      screenSize,
      batterySpecs,
      warrantyPeriodMonths = 12,
    } = body;

    if (!name || !brand || !modelName || !sku || !category || !mrp || !dealerPrice) {
      return apiError('Name, brand, modelName, SKU, category, MRP and dealerPrice are required', 400);
    }

    const existingSku = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existingSku) {
      return apiError(`Product with SKU '${sku.toUpperCase()}' already exists`, 409);
    }

    const stockStatus = stockQuantity > 10 ? 'IN_STOCK' : stockQuantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK';

    const product = await Product.create({
      name: name.trim(),
      brand: brand.trim(),
      modelName: modelName.trim(),
      sku: sku.toUpperCase().trim(),
      category,
      description: description || `${brand} ${modelName} with official manufacturer warranty.`,
      photograph: photograph || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
      color,
      ram,
      storage,
      processor,
      screenSize,
      batterySpecs,
      warrantyPeriodMonths: Number(warrantyPeriodMonths),
      mrp: Number(mrp),
      dealerPrice: Number(dealerPrice),
      retailSellingPrice: Number(retailSellingPrice || mrp),
      gstRatePercent: 18,
      hsnCode,
      requiresImei: Boolean(requiresImei),
      stockQuantity: Number(stockQuantity),
      stockStatus,
      status: 'ACTIVE',
    });

    // Create default warehouse inventory record
    let warehouse = await Warehouse.findOne({ isActive: true });
    if (!warehouse) {
      warehouse = await Warehouse.create({
        name: 'Apex Central Distribution Hub',
        code: 'WH-BLR-01',
        address: 'Plot 45, Tech Zone Industrial Corridor, Electronic City',
        city: 'Bangalore',
        state: 'Karnataka',
        isActive: true,
      });
    }

    await Inventory.findOneAndUpdate(
      { warehouseId: warehouse._id, productId: product._id },
      {
        warehouseId: warehouse._id,
        productId: product._id,
        onHandStock: Number(stockQuantity),
        availableStock: Number(stockQuantity),
        allocatedStock: 0,
        minimumThreshold: 5,
        reorderQuantity: 20,
      },
      { upsert: true, new: true }
    );

    await logDistributionAction({
      action: 'PRODUCT_CREATED',
      userId: user.id,
      entityType: 'Product',
      entityId: product._id.toString(),
      details: { name: product.name, sku: product.sku, brand: product.brand, dealerPrice: product.dealerPrice },
      req,
    });

    return apiSuccess(product, undefined, 201);
  } catch (err: any) {
    console.error('V1 Products POST Error:', err);
    return apiError(err.message || 'Failed to create product', 500);
  }
}
