import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { ShopVisit } from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shopId = searchParams.get('shopId');
    const status = searchParams.get('status');
    const approvalStatus = searchParams.get('approvalStatus');
    const brand = searchParams.get('brand');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    let employeeId = user.id;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { employee: true },
    });
    if (dbUser?.employee) {
      employeeId = dbUser.employee.id;
    }

    const isStaffOrAdmin = user.role === 'SUPER_ADMIN' || user.role === 'COMPANY_ADMIN' || user.role === 'HR_MANAGER' || user.role === 'MANAGER';

    const filter: any = {};

    // If sales rep, only show their own visits unless manager/admin
    if (!isStaffOrAdmin) {
      filter.employeeId = { $in: [user.id, employeeId] };
    }

    if (startDate && endDate) {
      filter.visitDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.visitDate = { $gte: startDate };
    }

    if (shopId && shopId !== 'ALL') {
      filter.retailerId = shopId;
    }

    if (status && status !== 'ALL') {
      filter.$or = [{ visitStatus: status }, { status }];
    }

    if (brand && brand !== 'ALL') {
      filter['salesLines.brandSnapshot'] = brand;
    }

    if (search) {
      filter.$or = [
        { visitId: { $regex: search, $options: 'i' } },
        { 'salesLines.productNameSnapshot': { $regex: search, $options: 'i' } },
        { 'salesLines.skuSnapshot': { $regex: search, $options: 'i' } },
        { visitRemarks: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, visits] = await Promise.all([
      ShopVisit.countDocuments(filter),
      ShopVisit.find(filter)
        .populate('retailerId', 'name ownerName phone address city area dealerCode gstin latitude longitude')
        .sort({ checkInTime: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const formatted = visits.map((v: any) => {
      const hasPendingApproval = v.salesLines?.some((l: any) => l.priceApprovalStatus === 'PENDING_APPROVAL');
      return {
        ...v,
        hasPendingApproval,
        photoCount: (v.shopFrontPhoto?.photoUrl ? 1 : 0) + (v.shopInteractionPhoto?.photoUrl ? 1 : 0),
      };
    });

    return apiSuccess(formatted, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Visits History GET Error:', err);
    return apiError(err.message || 'Failed to fetch visits history', 500);
  }
}
