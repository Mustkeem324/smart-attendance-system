export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { ShopVisit, Retailer } from '@/models/electronics-sales';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      retailerId,
      visitType = 'existing_shop',
      shopRegistrationReference,
      idempotencyKey,
    } = body;

    if (!retailerId) {
      return apiError('retailerId is required to start a shop visit', 400);
    }

    const retailer = await Retailer.findById(retailerId);
    if (!retailer) {
      return apiError('Retailer shop not found', 404);
    }

    // Resolve employee
    let employeeId = user.id;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { employee: true },
    });
    if (dbUser?.employee) {
      employeeId = dbUser.employee.id;
    }

    // Check idempotency if client provided key
    if (idempotencyKey) {
      const existingVisit = await ShopVisit.findOne({ idempotencyKey }).lean();
      if (existingVisit) {
        return apiSuccess(existingVisit, { message: 'Existing draft visit session resumed' });
      }
    }

    // Check if there is already an active in-progress visit for this shop & employee today
    const today = new Date().toISOString().split('T')[0];
    const existingDraft = await ShopVisit.findOne({
      retailerId: retailer._id,
      employeeId,
      visitDate: today,
      status: 'IN_PROGRESS',
    })
      .populate('retailerId', 'name ownerName phone address city area dealerCode latitude longitude geofenceRadiusMeters')
      .lean();

    if (existingDraft) {
      return apiSuccess(existingDraft, { message: 'Active visit session resumed' });
    }

    // Generate unique Visit ID
    const todayCompact = today.replace(/-/g, '').slice(0, 6);
    const countToday = await ShopVisit.countDocuments();
    const visitId = `VST-${todayCompact}-${String(countToday + 1).padStart(4, '0')}`;

    const visit = await ShopVisit.create({
      visitId,
      retailerId: retailer._id,
      employeeId,
      visitType,
      shopRegistrationReference,
      visitDate: today,
      startTime: new Date(),
      checkInTime: new Date(),
      latitude: retailer.latitude,
      longitude: retailer.longitude,
      accuracyMeters: 15,
      distanceFromShopMeters: 0,
      isWithinGeofence: true,
      status: 'IN_PROGRESS',
      visitStatus: 'DRAFT',
      idempotencyKey,
    });

    const populated = await ShopVisit.findById(visit._id)
      .populate('retailerId', 'name ownerName phone address city area dealerCode latitude longitude geofenceRadiusMeters')
      .lean();

    return apiSuccess(populated, { message: 'Shop visit session initialized successfully' }, 201);
  } catch (err: any) {
    console.error('Visit Start POST Error:', err);
    return apiError(err.message || 'Failed to start shop visit', 500);
  }
}
