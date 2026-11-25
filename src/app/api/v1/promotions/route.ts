export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Promotion } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const query: Record<string, any> = {};
    if (activeOnly) {
      query.isActive = true;
    }

    const promotions = await Promotion.find(query).sort({ createdAt: -1 }).lean();
    return apiSuccess(promotions);
  } catch (err: any) {
    console.error('Promotions GET Error:', err);
    return apiError(err.message || 'Failed to load promotions', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();

    const code = String(body.code || '').trim().toUpperCase();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const discountType = body.discountType === 'FLAT_AMOUNT' ? 'FLAT_AMOUNT' : 'PERCENTAGE';
    const discountValue = Number(body.discountValue);

    if (!code || !title || !description || !Number.isFinite(discountValue) || discountValue <= 0) {
      return apiError('Code, title, description, and positive discount value are required.', 400);
    }

    const validUntil = body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 30 * 86400000);
    if (Number.isNaN(validUntil.getTime())) {
      return apiError('Invalid validity end date.', 400);
    }

    const existing = await Promotion.findOne({ code });
    if (existing) {
      return apiError(`Promotion code '${code}' already exists.`, 409);
    }

    const promo = await Promotion.create({
      code,
      title,
      description,
      category: String(body.category || 'ALL').trim().toUpperCase(),
      discountType,
      discountValue,
      minOrderUnits: Math.max(1, Number(body.minOrderUnits) || 1),
      minOrderAmount: Math.max(0, Number(body.minOrderAmount) || 0),
      validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
      validUntil,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    await logDistributionAction({
      action: 'CREATE_PROMOTION',
      userId: user!.id,
      entityType: 'Promotion',
      entityId: promo._id.toString(),
      details: { code: promo.code, title: promo.title },
      req,
    });

    return apiSuccess(promo, { message: 'Promotion campaign created successfully' }, 201);
  } catch (err: any) {
    console.error('Promotions POST Error:', err);
    return apiError(err.message || 'Failed to create promotion', 500);
  }
}
