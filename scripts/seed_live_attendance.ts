import { prisma } from '../src/lib/prisma';
import { AttendanceStatus, RequestStatus, EventType } from '@prisma/client';

async function seedLiveAttendance() {
  console.log('🌱 Seeding realistic Live Attendance & Geofence data for today...');

  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error('Organization not found');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Find office locations
  const delHub = await prisma.officeLocation.findFirst({
    where: { name: { contains: 'Central Hub' } },
  });
  const noidaDc = await prisma.officeLocation.findFirst({
    where: { name: { contains: 'Distribution Center' } },
  });

  const hubId = delHub?.id;
  const hubLat = delHub?.latitude || 28.5355;
  const hubLng = delHub?.longitude || 77.2732;

  const noidaId = noidaDc?.id;
  const noidaLat = noidaDc?.latitude || 28.628;
  const noidaLng = noidaDc?.longitude || 77.3649;

  // Retrieve our 7 employees
  const employees = await prisma.employee.findMany({
    where: { organizationId: org.id },
    include: { user: true, department: true, branch: true },
  });

  console.log(`Found ${employees.length} employees`);

  const empByCode: Record<string, typeof employees[0]> = {};
  for (const emp of employees) {
    empByCode[emp.employeeCode] = emp;
  }

  // Clear existing records for today
  await prisma.attendanceEvent.deleteMany({
    where: { attendanceRecord: { date: todayStr } },
  });
  await prisma.attendanceException.deleteMany({
    where: { exceptionDate: todayStr },
  });
  await prisma.attendanceRecord.deleteMany({
    where: { date: todayStr },
  });
  await prisma.leaveRequest.deleteMany({
    where: {
      organizationId: org.id,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  // 1. EMP-001: Farhan Akhtar - Checked in, inside geofence (Central Hub)
  const emp1 = empByCode['EMP-001'];
  if (emp1) {
    const checkInTime = new Date(now.getTime() - 3.5 * 60 * 60 * 1000); // 3.5 hrs ago
    const record1 = await prisma.attendanceRecord.create({
      data: {
        organizationId: org.id,
        employeeId: emp1.id,
        officeLocationId: hubId,
        date: todayStr,
        checkInTime,
        status: AttendanceStatus.PRESENT,
        lateMinutes: 0,
        isVerified: true,
        checkInLatitude: hubLat + 0.00015,
        checkInLongitude: hubLng + 0.00012,
        checkInAccuracy: 8.5,
        checkInDistanceMeters: 22,
        checkInWithinGeofence: true,
        checkInPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
    });

    await prisma.attendanceEvent.create({
      data: {
        attendanceRecordId: record1.id,
        employeeId: emp1.id,
        officeLocationId: hubId,
        eventType: EventType.CHECK_IN,
        timestamp: checkInTime,
        latitude: hubLat + 0.00015,
        longitude: hubLng + 0.00012,
        accuracy: 8.5,
        distanceMeters: 22,
        isWithinGeofence: true,
        photo: record1.checkInPhoto,
      },
    });
    console.log(`✅ EMP-001 ${emp1.firstName} checked in at Central Hub (Inside Geofence: 22m)`);
  }

  // 2. EMP-002: Ayesha Siddiqui - Checked in, inside geofence (Central Hub)
  const emp2 = empByCode['EMP-002'];
  if (emp2) {
    const checkInTime = new Date(now.getTime() - 4.2 * 60 * 60 * 1000);
    const record2 = await prisma.attendanceRecord.create({
      data: {
        organizationId: org.id,
        employeeId: emp2.id,
        officeLocationId: hubId,
        date: todayStr,
        checkInTime,
        status: AttendanceStatus.PRESENT,
        lateMinutes: 0,
        isVerified: true,
        checkInLatitude: hubLat - 0.00018,
        checkInLongitude: hubLng + 0.0001,
        checkInAccuracy: 6.2,
        checkInDistanceMeters: 25,
        checkInWithinGeofence: true,
        checkInPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      },
    });

    await prisma.attendanceEvent.create({
      data: {
        attendanceRecordId: record2.id,
        employeeId: emp2.id,
        officeLocationId: hubId,
        eventType: EventType.CHECK_IN,
        timestamp: checkInTime,
        latitude: hubLat - 0.00018,
        longitude: hubLng + 0.0001,
        accuracy: 6.2,
        distanceMeters: 25,
        isWithinGeofence: true,
        photo: record2.checkInPhoto,
      },
    });
    console.log(`✅ EMP-002 ${emp2.firstName} checked in at Central Hub (Inside Geofence: 25m)`);
  }

  // 3. EMP-003: Tariq Mehmood - Shift Completed (Checked in 9:00, Checked out 17:30)
  const emp3 = empByCode['EMP-003'];
  if (emp3) {
    const checkInTime = new Date(now.getTime() - 8.5 * 60 * 60 * 1000);
    const checkOutTime = new Date(now.getTime() - 0.5 * 60 * 60 * 1000);
    const record3 = await prisma.attendanceRecord.create({
      data: {
        organizationId: org.id,
        employeeId: emp3.id,
        officeLocationId: noidaId,
        date: todayStr,
        checkInTime,
        checkOutTime,
        totalHours: 8.0,
        status: AttendanceStatus.PRESENT,
        lateMinutes: 0,
        isVerified: true,
        checkInLatitude: noidaLat + 0.0002,
        checkInLongitude: noidaLng - 0.0001,
        checkInAccuracy: 10.0,
        checkInDistanceMeters: 30,
        checkInWithinGeofence: true,
        checkOutLatitude: noidaLat + 0.00018,
        checkOutLongitude: noidaLng - 0.00012,
        checkOutAccuracy: 9.0,
        checkOutDistanceMeters: 28,
        checkOutWithinGeofence: true,
      },
    });

    await prisma.attendanceEvent.create({
      data: {
        attendanceRecordId: record3.id,
        employeeId: emp3.id,
        officeLocationId: noidaId,
        eventType: EventType.CHECK_IN,
        timestamp: checkInTime,
        latitude: noidaLat + 0.0002,
        longitude: noidaLng - 0.0001,
        accuracy: 10.0,
        distanceMeters: 30,
        isWithinGeofence: true,
      },
    });

    await prisma.attendanceEvent.create({
      data: {
        attendanceRecordId: record3.id,
        employeeId: emp3.id,
        officeLocationId: noidaId,
        eventType: EventType.CHECK_OUT,
        timestamp: checkOutTime,
        latitude: noidaLat + 0.00018,
        longitude: noidaLng - 0.00012,
        accuracy: 9.0,
        distanceMeters: 28,
        isWithinGeofence: true,
      },
    });
    console.log(`✅ EMP-003 ${emp3.firstName} completed shift at Noida DC (Total: 8.0h)`);
  }

  // 4. EMP-004: Mohammad Zaid - Checked in near boundary (Noida DC - 88m from center)
  const emp4 = empByCode['EMP-004'];
  if (emp4) {
    const checkInTime = new Date(now.getTime() - 2.8 * 60 * 60 * 1000);
    const record4 = await prisma.attendanceRecord.create({
      data: {
        organizationId: org.id,
        employeeId: emp4.id,
        officeLocationId: noidaId,
        date: todayStr,
        checkInTime,
        status: AttendanceStatus.PRESENT,
        lateMinutes: 0,
        isVerified: true,
        checkInLatitude: noidaLat + 0.00075,
        checkInLongitude: noidaLng + 0.00045,
        checkInAccuracy: 12.0,
        checkInDistanceMeters: 88,
        checkInWithinGeofence: true,
        checkInPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
    });

    await prisma.attendanceEvent.create({
      data: {
        attendanceRecordId: record4.id,
        employeeId: emp4.id,
        officeLocationId: noidaId,
        eventType: EventType.CHECK_IN,
        timestamp: checkInTime,
        latitude: noidaLat + 0.00075,
        longitude: noidaLng + 0.00045,
        accuracy: 12.0,
        distanceMeters: 88,
        isWithinGeofence: true,
        photo: record4.checkInPhoto,
      },
    });
    console.log(`✅ EMP-004 ${emp4.firstName} checked in near perimeter boundary (88m)`);
  }

  // 5. EMP-005: Rehan Shaikh - On Leave (Approved Casual Leave)
  const emp5 = empByCode['EMP-005'];
  if (emp5) {
    let leaveType = await prisma.leaveType.findFirst({ where: { organizationId: org.id } });
    if (!leaveType) {
      leaveType = await prisma.leaveType.create({
        data: {
          organizationId: org.id,
          name: 'Casual Leave',
          code: 'CL',
          daysAllowed: 12,
          isPaid: true,
        },
      });
    }

    const startOfDay = new Date(todayStr + 'T00:00:00.000Z');
    const endOfDay = new Date(todayStr + 'T23:59:59.999Z');

    await prisma.leaveRequest.create({
      data: {
        organizationId: org.id,
        employeeId: emp5.id,
        leaveTypeId: leaveType.id,
        startDate: startOfDay,
        endDate: endOfDay,
        totalDays: 1.0,
        reason: 'Family event and personal logistics appointment',
        status: RequestStatus.APPROVED,
        reviewedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ EMP-005 ${emp5.firstName} marked On Approved Leave`);
  }

  // 6. EMP-006: Zoya Khan - Absent (not punched in today)
  const emp6 = empByCode['EMP-006'];
  if (emp6) {
    console.log(`✅ EMP-006 ${emp6.firstName} unpunched (Marked as Absent)`);
  }

  // 7. EMP-007: Bilal Qureshi - Late Arrival + Exception Request
  const emp7 = empByCode['EMP-007'];
  if (emp7) {
    const checkInTime = new Date(now.getTime() - 1.5 * 60 * 60 * 1000);
    const record7 = await prisma.attendanceRecord.create({
      data: {
        organizationId: org.id,
        employeeId: emp7.id,
        officeLocationId: hubId,
        date: todayStr,
        checkInTime,
        status: AttendanceStatus.LATE,
        lateMinutes: 42,
        isVerified: true,
        checkInLatitude: hubLat + 0.0011,
        checkInLongitude: hubLng + 0.0008,
        checkInAccuracy: 15.0,
        checkInDistanceMeters: 135,
        checkInWithinGeofence: false, // 135m is outside 100m geofence!
        checkInPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      },
    });

    await prisma.attendanceEvent.create({
      data: {
        attendanceRecordId: record7.id,
        employeeId: emp7.id,
        officeLocationId: hubId,
        eventType: EventType.CHECK_IN,
        timestamp: checkInTime,
        latitude: hubLat + 0.0011,
        longitude: hubLng + 0.0008,
        accuracy: 15.0,
        distanceMeters: 135,
        isWithinGeofence: false,
        photo: record7.checkInPhoto,
      },
    });

    // Exception for outside geofence due to transit roadblock
    await prisma.attendanceException.create({
      data: {
        organizationId: org.id,
        employeeId: emp7.id,
        attendanceRecordId: record7.id,
        exceptionDate: todayStr,
        reason: 'OUTSIDE_GEOFENCE',
        explanation: 'Arrived at outer gate during security vehicle blockage (135m away). Requesting geo-boundary exception clearance.',
        status: RequestStatus.PENDING,
      },
    });

    console.log(`✅ EMP-007 ${emp7.firstName} seeded as Late Arrival (42m late) + Outside Geofence Exception`);
  }

  console.log('🎉 Live attendance & geofence seeding complete!');
}

seedLiveAttendance()
  .catch((e) => {
    console.error('Error seeding attendance:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
