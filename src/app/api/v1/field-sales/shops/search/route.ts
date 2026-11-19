import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { Retailer, ShopVisit } from '@/models/electronics-sales';
import { calculateHaversineDistanceMeters } from '@/lib/geo';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const filter: any = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { dealerCode: { $regex: query, $options: 'i' } },
        { ownerName: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } },
        { pincode: { $regex: query, $options: 'i' } },
        { area: { $regex: query, $options: 'i' } },
      ];
    }

    if (city && city !== 'ALL') filter.city = city;
    if (category && category !== 'ALL') filter.shopCategory = category;

    const shops = await Retailer.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

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

    if (userLat !== null && userLng !== null) {
      enriched.sort((a, b) => (a.distanceMeters || 999999) - (b.distanceMeters || 999999));
    }

    return apiSuccess(enriched);
  } catch (err: any) {
    console.error('Shops Search GET Error:', err);
    return apiError(err.message || 'Failed to search shops', 500);
  }
}
