export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Product } from '@/models/electronics-sales';
import { getAuthSession } from '@/lib/auth';

function checkDealerAccess(session: any): boolean {
  if (!session || !session.user) return false;
  const role = session.user.role;
  const authorizedRoles = [
    'SUPER_ADMIN',
    'COMPANY_ADMIN',
    'HR_MANAGER',
    'TEAM_MANAGER',
    'SALES_MANAGER',
    'FIELD_SALES_REP',
    'INVENTORY_MANAGER',
  ];
  if (authorizedRoles.includes(role)) return true;
  if (role === 'EMPLOYEE') {
    const email = session.user.email?.toLowerCase() || '';
    const designation = session.employee?.designation?.toLowerCase() || '';
    if (email.includes('dealer') || designation.includes('dealer') || designation.includes('retailer')) {
      return true;
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getAuthSession(req);
    const hasDealerAccess = checkDealerAccess(session);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';
    const brand = searchParams.get('brand')?.trim() || '';
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
    const ram = searchParams.get('ram')?.trim() || '';
    const storage = searchParams.get('storage')?.trim() || '';
    const color = searchParams.get('color')?.trim() || '';
    const availability = searchParams.get('availability')?.trim() || '';
    const warranty = searchParams.get('warranty') ? Number(searchParams.get('warranty')) : null;
    const sort = searchParams.get('sort')?.trim() || 'featured';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 12)));

    const filter: any = { status: 'ACTIVE' };

    // Search query across name, brand, modelName, sku, barcode, description
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { modelName: { $regex: q, $options: 'i' } },
        { modelNumber: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { processor: { $regex: q, $options: 'i' } },
      ];
    }

    // Category filter
    if (category && category !== 'ALL') {
      filter.category = category.toUpperCase();
    }

    // Brand filter (comma separated)
    if (brand && brand !== 'ALL') {
      const brandsList = brand.split(',').map((b) => b.trim()).filter(Boolean);
      if (brandsList.length > 0) {
        filter.brand = { $in: brandsList.map((b) => new RegExp(`^${b}$`, 'i')) };
      }
    }

    // Price range filter (on MRP / retail price)
    if (minPrice !== null || maxPrice !== null) {
      filter.mrp = {};
      if (minPrice !== null && !isNaN(minPrice)) filter.mrp.$gte = minPrice;
      if (maxPrice !== null && !isNaN(maxPrice)) filter.mrp.$lte = maxPrice;
    }

    // RAM filter
    if (ram) {
      const ramList = ram.split(',').map((r) => r.trim()).filter(Boolean);
      if (ramList.length > 0) {
        filter.ram = { $in: ramList };
      }
    }

    // Storage filter
    if (storage) {
      const storageList = storage.split(',').map((s) => s.trim()).filter(Boolean);
      if (storageList.length > 0) {
        filter.storage = { $in: storageList };
      }
    }

    // Color filter
    if (color) {
      const colorList = color.split(',').map((c) => c.trim()).filter(Boolean);
      if (colorList.length > 0) {
        filter.$or = [
          { color: { $in: colorList.map((c) => new RegExp(c, 'i')) } },
          { availableColors: { $in: colorList.map((c) => new RegExp(c, 'i')) } },
        ];
      }
    }

    // Availability
    if (availability) {
      filter.stockStatus = availability;
    }

    // Warranty
    if (warranty !== null && !isNaN(warranty)) {
      filter.warrantyPeriodMonths = { $gte: warranty };
    }

    // Sorting
    let sortObj: any = { featured: -1, createdAt: -1 };
    if (sort === 'price_asc') sortObj = { mrp: 1 };
    else if (sort === 'price_desc') sortObj = { mrp: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'name_asc') sortObj = { name: 1 };
    else if (sort === 'featured') sortObj = { featured: -1, rating: -1, createdAt: -1 };

    const total = await Product.countDocuments(filter);
    const skip = (page - 1) * limit;

    const rawProducts = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // Map products according to dealer authorization
    const products = rawProducts.map((p: any) => ({
      _id: p._id.toString(),
      name: p.name,
      brand: p.brand,
      modelName: p.modelName,
      modelNumber: p.modelNumber,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      description: p.description,
      photograph: p.photograph,
      galleryImages: p.galleryImages || (p.photograph ? [p.photograph] : []),
      color: p.color,
      availableColors: p.availableColors || (p.color ? [p.color] : []),
      ram: p.ram,
      storage: p.storage,
      processor: p.processor,
      screenSize: p.screenSize,
      displaySpecs: p.displaySpecs,
      batterySpecs: p.batterySpecs,
      connectivity: p.connectivity,
      warrantyPeriodMonths: p.warrantyPeriodMonths,
      mrp: p.mrp,
      retailSellingPrice: p.retailSellingPrice || p.mrp,
      // Protected dealer price: only available to authorized accounts
      dealerPrice: hasDealerAccess ? p.dealerPrice : null,
      isDealerAuthorized: hasDealerAccess,
      gstRatePercent: p.gstRatePercent,
      hsnCode: p.hsnCode,
      requiresImei: p.requiresImei,
      stockQuantity: hasDealerAccess ? (p.stockQuantity ?? 25) : undefined,
      stockStatus: p.stockStatus || 'IN_STOCK',
      featured: Boolean(p.featured),
      rating: p.rating || 4.8,
      reviewCount: p.reviewCount || 0,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      isDealerAuthorized: hasDealerAccess,
      products,
    });
  } catch (error: any) {
    console.error('Error fetching catalog:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}
