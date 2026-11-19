import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { ShopVisit, Retailer } from '@/models/electronics-sales';
import { calculateHaversineDistanceMeters } from '@/lib/geo';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { id } = params;
    const body = await req.json();

    const {
      latitude,
      longitude,
      accuracyMeters = 15,
      geocodedAddress,
      captureMethod = 'BROWSER_GEOLOCATION_HIGH_ACCURACY',
    } = body;

    if (latitude === undefined || longitude === undefined) {
      return apiError('Latitude and longitude are required', 400);
    }

    const numLat = Number(latitude);
    const numLng = Number(longitude);

    if (isNaN(numLat) || numLat < -90 || numLat > 90) {
      return apiError('Invalid latitude value (-90 to 90 expected)', 400);
    }
    if (isNaN(numLng) || numLng < -180 || numLng > 180) {
      return apiError('Invalid longitude value (-180 to 180 expected)', 400);
    }

    // Find visit by MongoDB _id or human-readable visitId
    const visit = await ShopVisit.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { visitId: id }],
    });

    if (!visit) {
      return apiError('Shop visit not found', 404);
    }

    const retailer = await Retailer.findById(visit.retailerId);
    let distanceFromShopMeters = 0;
    let isWithinGeofence = true;
    let locationVerificationStatus: 'VERIFIED' | 'OUTSIDE_GEOFENCE' | 'POOR_ACCURACY' | 'FLAGGED_REVIEW' = 'VERIFIED';
    let locationVerificationNotes = 'GPS coordinates captured within registered shop geofence.';

    if (retailer?.latitude && retailer?.longitude) {
      distanceFromShopMeters = Math.round(
        calculateHaversineDistanceMeters(numLat, numLng, retailer.latitude, retailer.longitude)
      );
      const allowedRadius = retailer.geofenceRadiusMeters || 100;
      isWithinGeofence = distanceFromShopMeters <= allowedRadius;

      if (!isWithinGeofence) {
        locationVerificationStatus = 'OUTSIDE_GEOFENCE';
        locationVerificationNotes = `Captured ${distanceFromShopMeters}m from registered shop (permitted radius: ${allowedRadius}m). Flagged for administrative audit.`;
      }
    }

    if (Number(accuracyMeters) > 80) {
      locationVerificationStatus = 'POOR_ACCURACY';
      locationVerificationNotes = `GPS accuracy estimate ±${accuracyMeters}m is broader than recommended 50m threshold.`;
    }

    const googleMapsUrl = `https://www.google.com/maps?q=${numLat.toFixed(6)},${numLng.toFixed(6)}`;

    // Update visit with GPS information
    visit.latitude = numLat;
    visit.longitude = numLng;
    visit.accuracyMeters = Number(accuracyMeters);
    visit.distanceFromShopMeters = distanceFromShopMeters;
    visit.isWithinGeofence = isWithinGeofence;
    visit.googleMapsUrl = googleMapsUrl;
    visit.geocodedAddress = geocodedAddress || retailer?.address;
    visit.locationVerificationStatus = locationVerificationStatus;
    visit.locationVerificationNotes = locationVerificationNotes;

    await visit.save();

    return apiSuccess({
      visitId: visit.visitId || visit._id,
      latitude: numLat,
      longitude: numLng,
      accuracyMeters: Number(accuracyMeters),
      googleMapsUrl,
      distanceFromShopMeters,
      isWithinGeofence,
      locationVerificationStatus,
      locationVerificationNotes,
      geocodedAddress: visit.geocodedAddress,
      capturedAt: new Date(),
    });
  } catch (err: any) {
    console.error('Visit Location POST Error:', err);
    return apiError(err.message || 'Failed to capture visit location', 500);
  }
}
