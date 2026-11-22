export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateGeofence } from '@/lib/geo';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('latitude');
    const lonStr = searchParams.get('longitude');
    const accStr = searchParams.get('accuracy');
    const mockFlag = searchParams.get('clientMockFlag') === 'true';

    const employee = await prisma.employee.findUnique({
      where: { id: session.employee.id },
      include: {
        officeLocation: true,
        branch: true,
        shift: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Determine target office coordinates (prefer specific OfficeLocation, fallback to Branch)
    const officeLat = employee.officeLocation?.latitude ?? employee.branch?.latitude;
    const officeLon = employee.officeLocation?.longitude ?? employee.branch?.longitude;
    const allowedRadius = employee.officeLocation?.radiusMeters ?? employee.branch?.radiusMeters ?? 50;
    const minGpsAccuracy = employee.officeLocation?.minGpsAccuracyMeters ?? 30;
    const officeName = employee.officeLocation?.name ?? employee.branch?.name ?? 'Assigned Office';

    if (officeLat === undefined || officeLon === undefined) {
      return NextResponse.json({ error: 'No office or branch location configured for employee' }, { status: 400 });
    }

    let validationResult = null;
    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      const acc = accStr ? parseFloat(accStr) : 10;

      validationResult = validateGeofence(
        lat,
        lon,
        acc,
        officeLat,
        officeLon,
        allowedRadius,
        mockFlag,
        minGpsAccuracy
      );
    }

    return NextResponse.json({
      success: true,
      office: {
        id: employee.officeLocation?.id ?? employee.branch?.id,
        name: officeName,
        latitude: officeLat,
        longitude: officeLon,
        radiusMeters: allowedRadius,
        minGpsAccuracyMeters: minGpsAccuracy,
        allowedTimeWindows: employee.officeLocation?.allowedTimeWindows ?? '00:00-23:59',
      },
      shift: employee.shift
        ? {
            id: employee.shift.id,
            name: employee.shift.name,
            startTime: employee.shift.startTime,
            endTime: employee.shift.endTime,
            gracePeriodMinutes: employee.shift.gracePeriodMinutes,
          }
        : null,
      validation: validationResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
