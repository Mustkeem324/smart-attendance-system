import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ShopVisit, Retailer } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const retailerId = searchParams.get('retailerId');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (retailerId && retailerId !== 'ALL') filter.retailerId = retailerId;
    if (employeeId && employeeId !== 'ALL') filter.employeeId = employeeId;
    if (status && status !== 'ALL') filter.status = status;

    const [total, visits] = await Promise.all([
      ShopVisit.countDocuments(filter),
      ShopVisit.find(filter)
        .populate('retailerId', 'name ownerName phone city state area dealerCode')
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return apiSuccess(visits, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Field Visits GET Error:', err);
    return apiError(err.message || 'Failed to fetch field visits', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      retailerId,
      latitude,
      longitude,
      visitPurpose = 'Sales & Stock Replenishment',
      notes,
      photos = [],
    } = body;

    if (!retailerId || latitude === undefined || longitude === undefined) {
      return apiError('retailerId, latitude and longitude are required', 400);
    }

    const retailer = await Retailer.findById(retailerId);
    if (!retailer) return apiError('Retailer not found', 404);

    // Calculate approximate distance from shop
    const latDiff = Math.abs(retailer.latitude - Number(latitude));
    const lonDiff = Math.abs(retailer.longitude - Number(longitude));
    const distanceMeters = Math.round(Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111000);
    const isWithinGeofence = distanceMeters <= (retailer.geofenceRadiusMeters || 100);

    const visit = await ShopVisit.create({
      retailerId: retailer._id,
      employeeId: user.id,
      visitDate: new Date().toISOString().split('T')[0],
      checkInTime: new Date(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracyMeters: 15,
      distanceFromShopMeters: distanceMeters,
      isWithinGeofence,
      photos,
      visitPurpose,
      notes,
      status: 'COMPLETED',
    });

    await logDistributionAction({
      action: 'FIELD_VISIT_RECORDED',
      userId: user.id,
      entityType: 'ShopVisit',
      entityId: visit._id.toString(),
      details: { retailerId: retailer._id, isWithinGeofence, distanceMeters },
      req,
    });

    return apiSuccess(visit, undefined, 201);
  } catch (err: any) {
    console.error('V1 Field Visits POST Error:', err);
    return apiError(err.message || 'Failed to record field visit', 500);
  }
}
