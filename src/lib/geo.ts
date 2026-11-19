/**
 * Haversine formula to calculate great-circle distance between two GPS coordinates in meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

export type GeofenceStatusCode = 'INSIDE_GEOFENCE' | 'OUTSIDE_GEOFENCE' | 'LOW_ACCURACY' | 'SYNTHETIC_MOCK_DETECTED';

export interface GeofenceValidationResult {
  code: GeofenceStatusCode;
  isWithinGeofence: boolean;
  isAccuracyAcceptable: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  minAccuracyRequiredMeters: number;
  isMockDetected: boolean;
  accuracyMeters: number;
  statusMessage: string;
}

export function validateGeofence(
  employeeLat: number,
  employeeLon: number,
  accuracy: number,
  officeLat: number,
  officeLon: number,
  allowedRadiusMeters: number = 50,
  clientMockFlag?: boolean,
  minGpsAccuracyMeters: number = 30
): GeofenceValidationResult {
  const distance = calculateHaversineDistanceMeters(
    employeeLat,
    employeeLon,
    officeLat,
    officeLon
  );

  // Heuristics for mock/spoofed GPS
  let isMockDetected = false;
  if (clientMockFlag === true) {
    isMockDetected = true;
  }

  // If accuracy reported is unrealistically perfect (e.g. 0.000 or negative), often synthetic emulator
  if (accuracy <= 0.1) {
    isMockDetected = true;
  }

  // Check if GPS accuracy meets the minimum accuracy threshold
  const isAccuracyAcceptable = accuracy <= minGpsAccuracyMeters;
  const isWithinGeofence = distance <= allowedRadiusMeters;

  let code: GeofenceStatusCode = 'INSIDE_GEOFENCE';
  let statusMessage = '';

  if (isMockDetected) {
    code = 'SYNTHETIC_MOCK_DETECTED';
    statusMessage = 'Suspicious synthetic GPS coordinates or mock location emulator detected.';
  } else if (!isAccuracyAcceptable) {
    code = 'LOW_ACCURACY';
    statusMessage = `Low GPS accuracy (±${accuracy.toFixed(1)}m). Minimum required accuracy is ±${minGpsAccuracyMeters}m. Please move near a window or outdoors and retry.`;
  } else if (!isWithinGeofence) {
    code = 'OUTSIDE_GEOFENCE';
    statusMessage = `Outside geofence! You are ${distance.toFixed(1)}m away from registered office location (Allowed radius: ${allowedRadiusMeters}m).`;
  } else {
    code = 'INSIDE_GEOFENCE';
    statusMessage = `Inside geofence. Distance: ${distance.toFixed(1)}m from office (Allowed: ${allowedRadiusMeters}m).`;
  }

  return {
    code,
    isWithinGeofence,
    isAccuracyAcceptable,
    distanceMeters: distance,
    allowedRadiusMeters,
    minAccuracyRequiredMeters: minGpsAccuracyMeters,
    isMockDetected,
    accuracyMeters: accuracy,
    statusMessage,
  };
}
