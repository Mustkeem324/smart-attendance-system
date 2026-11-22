export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Brand, Product } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();

    // Get live product counts per brand
    const brandCounts = await Product.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$brand', count: { $sum: 1 }, totalStock: { $sum: '$stockQuantity' } } },
    ]);

    const countMap: Record<string, { count: number; stock: number }> = {};
    brandCounts.forEach((bc) => {
      countMap[bc._id] = { count: bc.count, stock: bc.totalStock || 0 };
    });

    const brands = await Brand.find({ status: 'ACTIVE' }).sort({ tier: 1, name: 1 }).lean();

    const result = brands.map((b) => ({
      ...b,
      activeModelsCount: countMap[b.name]?.count || b.activeModelsCount || 0,
      totalStock: countMap[b.name]?.stock || 0,
    }));

    return apiSuccess(result);
  } catch (err: any) {
    console.error('V1 Brands GET Error:', err);
    return apiError(err.message || 'Failed to fetch brands', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, code, tier, authorizedMarginPercent, description, logoUrl } = body;

    if (!name || !code) {
      return apiError('Brand name and code are required', 400);
    }

    const brand = await Brand.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      tier: tier || 'AUTHORIZED_TIER_1',
      authorizedMarginPercent: Number(authorizedMarginPercent || 10),
      description,
      logoUrl,
      isOfficialPartner: true,
      status: 'ACTIVE',
    });

    await logDistributionAction({
      action: 'BRAND_CREATED',
      userId: user.id,
      entityType: 'Brand',
      entityId: brand._id.toString(),
      details: { name: brand.name, code: brand.code, tier: brand.tier },
      req,
    });

    return apiSuccess(brand, undefined, 201);
  } catch (err: any) {
    console.error('V1 Brands POST Error:', err);
    return apiError(err.message || 'Failed to create brand', 500);
  }
}
