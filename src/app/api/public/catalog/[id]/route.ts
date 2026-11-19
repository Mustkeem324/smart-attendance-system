import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const session = await getAuthSession(req);
    const hasDealerAccess = checkDealerAccess(session);

    const { id } = params;
    let query: any = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { sku: id.toUpperCase() };
    }

    const rawProduct: any = await Product.findOne(query).lean();
    if (!rawProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Find related products in same category or brand
    const rawRelated = await Product.find({
      _id: { $ne: rawProduct._id },
      $or: [{ category: rawProduct.category }, { brand: rawProduct.brand }],
      status: 'ACTIVE',
    })
      .limit(4)
      .lean();

    const product = {
      _id: rawProduct._id.toString(),
      name: rawProduct.name,
      brand: rawProduct.brand,
      modelName: rawProduct.modelName,
      modelNumber: rawProduct.modelNumber,
      sku: rawProduct.sku,
      barcode: rawProduct.barcode,
      category: rawProduct.category,
      description: rawProduct.description,
      photograph: rawProduct.photograph,
      galleryImages: rawProduct.galleryImages || (rawProduct.photograph ? [rawProduct.photograph] : []),
      color: rawProduct.color,
      availableColors: rawProduct.availableColors || (rawProduct.color ? [rawProduct.color] : []),
      ram: rawProduct.ram,
      storage: rawProduct.storage,
      processor: rawProduct.processor,
      screenSize: rawProduct.screenSize,
      displaySpecs: rawProduct.displaySpecs,
      batterySpecs: rawProduct.batterySpecs,
      connectivity: rawProduct.connectivity,
      warrantyPeriodMonths: rawProduct.warrantyPeriodMonths,
      mrp: rawProduct.mrp,
      retailSellingPrice: rawProduct.retailSellingPrice || rawProduct.mrp,
      dealerPrice: hasDealerAccess ? rawProduct.dealerPrice : null,
      isDealerAuthorized: hasDealerAccess,
      gstRatePercent: rawProduct.gstRatePercent,
      hsnCode: rawProduct.hsnCode,
      requiresImei: rawProduct.requiresImei,
      stockQuantity: hasDealerAccess ? (rawProduct.stockQuantity ?? 25) : undefined,
      stockStatus: rawProduct.stockStatus || 'IN_STOCK',
      featured: Boolean(rawProduct.featured),
      rating: rawProduct.rating || 4.8,
      reviewCount: rawProduct.reviewCount || 0,
    };

    const relatedProducts = rawRelated.map((p: any) => ({
      _id: p._id.toString(),
      name: p.name,
      brand: p.brand,
      modelName: p.modelName,
      sku: p.sku,
      category: p.category,
      photograph: p.photograph,
      color: p.color,
      ram: p.ram,
      storage: p.storage,
      mrp: p.mrp,
      retailSellingPrice: p.retailSellingPrice || p.mrp,
      dealerPrice: hasDealerAccess ? p.dealerPrice : null,
      stockStatus: p.stockStatus || 'IN_STOCK',
    }));

    return NextResponse.json({
      success: true,
      product,
      isDealerAuthorized: hasDealerAccess,
      relatedProducts,
    });
  } catch (error: any) {
    console.error('Error fetching product details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch product details' },
      { status: 500 }
    );
  }
}
