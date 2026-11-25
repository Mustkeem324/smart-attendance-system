export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Promotion } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();

    const updates: Record<string, any> = {};
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.category !== undefined) updates.category = String(body.category).trim().toUpperCase();
    if (body.discountType !== undefined) updates.discountType = body.discountType === 'FLAT_AMOUNT' ? 'FLAT_AMOUNT' : 'PERCENTAGE';
    if (body.discountValue !== undefined) updates.discountValue = Number(body.discountValue);
    if (body.minOrderUnits !== undefined) updates.minOrderUnits = Math.max(1, Number(body.minOrderUnits));
    if (body.minOrderAmount !== undefined) updates.minOrderAmount = Math.max(0, Number(body.minOrderAmount));
    if (body.validUntil !== undefined) updates.validUntil = new Date(body.validUntil);
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    const updated = await Promotion.findByIdAndUpdate(params.id, updates, { new: true });
    if (!updated) return apiError('Promotion campaign not found', 404);

    await logDistributionAction({
      action: 'UPDATE_PROMOTION',
      userId: user!.id,
      entityType: 'Promotion',
      entityId: updated._id.toString(),
      details: updates,
      req,
    });
    return apiSuccess(updated, { message: 'Promotion campaign updated' });
  } catch (err: any) {
    return apiError(err.message || 'Failed to update promotion', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const deleted = await Promotion.findByIdAndDelete(params.id);
    if (!deleted) return apiError('Promotion campaign not found', 404);

    await logDistributionAction({
      action: 'DELETE_PROMOTION',
      userId: user!.id,
      entityType: 'Promotion',
      entityId: params.id,
      details: { code: deleted.code },
      req,
    });
    return apiSuccess({ id: params.id }, { message: 'Promotion campaign deleted' });
  } catch (err: any) {
    return apiError(err.message || 'Failed to delete promotion', 500);
  }
}
