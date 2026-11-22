export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { Retailer, ShopVisit } from '@/models/electronics-sales';
import { calculateHaversineDistanceMeters } from '@/lib/geo';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;

    let employeeId = user.id;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { employee: true },
    });
    if (dbUser?.employee) {
      employeeId = dbUser.employee.id;
    }

    const shops = await Retailer.find({
      $or: [
        { assignedEmployeeId: employeeId },
        { assignedEmployeeId: user.id },
        { status: 'ACTIVE' },
      ],
    })
      .sort({ name: 1 })
      .lean();

    // Enrich with distance (if coordinates provided) and previous visit date
    const enriched = await Promise.all(
      shops.map(async (shop: any) => {
        let distanceMeters: number | null = null;
        if (userLat !== null && userLng !== null && shop.latitude && shop.longitude) {
          distanceMeters = Math.round(calculateHaversineDistanceMeters(userLat, userLng, shop.latitude, shop.longitude));
        }

        const lastVisit = await ShopVisit.findOne({ retailerId: shop._id })
          .sort({ checkInTime: -1 })
          .select('visitDate checkInTime status visitStatus')
          .lean();

        return {
          ...shop,
          distanceMeters,
          previousVisitDate: lastVisit?.visitDate || null,
          lastVisitStatus: lastVisit?.visitStatus || lastVisit?.status || null,
        };
      })
    );

    // If user coordinates provided, sort by distance
    if (userLat !== null && userLng !== null) {
      enriched.sort((a, b) => (a.distanceMeters || 999999) - (b.distanceMeters || 999999));
    }

    return apiSuccess(enriched);
  } catch (err: any) {
    console.error('Assigned Shops GET Error:', err);
    return apiError(err.message || 'Failed to fetch assigned shops', 500);
  }
}
