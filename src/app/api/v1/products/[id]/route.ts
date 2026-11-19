import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Product, Inventory } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const product = await Product.findById(params.id).lean();
    if (!product) return apiError('Product not found', 404);

    const inventories = await Inventory.find({ productId: product._id }).populate('warehouseId').lean();

    return apiSuccess({
      ...product,
      inventories,
    });
  } catch (err: any) {
    console.error('V1 Products [id] GET Error:', err);
    return apiError(err.message || 'Failed to fetch product', 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INVENTORY_MANAGER']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();

    const updated = await Product.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updated) return apiError('Product not found', 404);

    await logDistributionAction({
      action: 'PRODUCT_UPDATED',
      userId: user.id,
      entityType: 'Product',
      entityId: updated._id.toString(),
      details: body,
      req,
    });

    return apiSuccess(updated);
  } catch (err: any) {
    console.error('V1 Products [id] PUT Error:', err);
    return apiError(err.message || 'Failed to update product', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const product = await Product.findByIdAndUpdate(params.id, { status: 'ARCHIVED' }, { new: true });
    if (!product) return apiError('Product not found', 404);

    await logDistributionAction({
      action: 'PRODUCT_ARCHIVED',
      userId: user.id,
      entityType: 'Product',
      entityId: product._id.toString(),
      req,
    });

    return apiSuccess({ message: 'Product archived successfully' });
  } catch (err: any) {
    console.error('V1 Products [id] DELETE Error:', err);
    return apiError(err.message || 'Failed to archive product', 500);
  }
}
