import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { startShopVisit } from '@/lib/field-sales-engine';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const body = await req.json();
    const { shopId, latitude, longitude, accuracyMeters, photoUrl, notes } = body;

    if (!shopId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'shopId, latitude, and longitude are required' }, { status: 400 });
    }

    const visit = await startShopVisit({
      organizationId: session.user.organizationId,
      shopId,
      employeeId: session.employee.id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracyMeters: accuracyMeters ? parseFloat(accuracyMeters) : 15.0,
      photoUrl,
      notes,
    });

    return NextResponse.json({
      success: true,
      message: visit.isWithinGeofence
        ? 'Shop visit check-in verified successfully (within geofence).'
        : `Check-in recorded with location mismatch warning (${visit.distanceFromShopMeters}m from shop).`,
      visit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
