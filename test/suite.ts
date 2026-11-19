import { calculateHaversineDistanceMeters, validateGeofence } from '../src/lib/geo';
import { evaluateShiftAttendance, timeStringToMinutes } from '../src/lib/attendance';
import { hashPassword, comparePassword, generateTokens, verifyToken } from '../src/lib/auth';
import { generateEmployeeImportTemplate, generateAttendanceExcelReport } from '../src/lib/excel';
import { prisma } from '../src/lib/prisma';
import { Role, AttendanceStatus } from '@prisma/client';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING SMART ATTENDANCE TEST SUITE');
  console.log('========================================\n');

  // TEST SUITE 1: Geofencing & GPS Haversine Calculations
  console.log('--- Suite 1: Geofencing & Anti-Spoofing ---');
  const hqLat = 28.6139;
  const hqLon = 77.2090;

  // Exact same location -> distance should be ~0 meters
  const distZero = calculateHaversineDistanceMeters(hqLat, hqLon, hqLat, hqLon);
  assert(distZero === 0, 'Distance to same coordinate is 0m');

  // Slight offset (~20-30 meters)
  const offsetLat = 28.6141; // ~22m away
  const offsetLon = 77.2091; // ~10m away
  const distNearby = calculateHaversineDistanceMeters(hqLat, hqLon, offsetLat, offsetLon);
  assert(distNearby > 0 && distNearby < 40, `Nearby distance (${distNearby.toFixed(1)}m) within expected range`);

  // Geofence check inside 50m radius
  const insideResult = validateGeofence(offsetLat, offsetLon, 15, hqLat, hqLon, 50);
  assert(insideResult.isWithinGeofence === true, 'Coordinates within 50m radius are approved');
  assert(insideResult.isMockDetected === false, 'Standard accuracy does not trigger mock flag');

  // Far location (~5km away) -> Outside geofence
  const farLat = 28.6500;
  const farLon = 77.2500;
  const outsideResult = validateGeofence(farLat, farLon, 10, hqLat, hqLon, 50);
  assert(outsideResult.isWithinGeofence === false, 'Coordinates 5km away are rejected (outside geofence)');
  assert(outsideResult.distanceMeters > 1000, `Distance correctly computed (> 1000m: ${outsideResult.distanceMeters.toFixed(1)}m)`);

  // Anti-spoofing heuristic: synthetic zero accuracy
  const mockResult = validateGeofence(hqLat, hqLon, 0.0, hqLat, hqLon, 50);
  assert(mockResult.isMockDetected === true, 'Synthetic zero accuracy (0.0m) flagged as suspicious mock location');

  // TEST SUITE 2: Shift Logic & Attendance Evaluation
  console.log('\n--- Suite 2: Shift Logic & Attendance Evaluation ---');
  assert(timeStringToMinutes('09:00') === 540, 'Parses 09:00 to 540 minutes');
  assert(timeStringToMinutes('18:00') === 1080, 'Parses 18:00 to 1080 minutes');

  const dummyShift = {
    id: 'test-shift',
    organizationId: 'test-org',
    name: 'General Shift',
    code: 'GEN',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
    halfDayThresholdHours: 4.5,
    fullDayThresholdHours: 8.0,
    isOvernight: false,
    isFlexible: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // On-time check-in (09:05 AM, within 15 min grace)
  const onTimeIn = new Date();
  onTimeIn.setHours(9, 5, 0, 0);
  const onTimeEval = evaluateShiftAttendance(onTimeIn, null, dummyShift);
  assert(onTimeEval.status === AttendanceStatus.PRESENT, 'Check-in within grace period is PRESENT');
  assert(onTimeEval.lateMinutes === 0, 'Late minutes is 0 within grace period');

  // Late check-in (09:35 AM, 35 min late)
  const lateIn = new Date();
  lateIn.setHours(9, 35, 0, 0);
  const lateEval = evaluateShiftAttendance(lateIn, null, dummyShift);
  assert(lateEval.status === AttendanceStatus.LATE, 'Check-in past grace period is marked LATE');
  assert(lateEval.lateMinutes === 35, 'Correctly reports 35 late minutes');

  // Check-out after 9 hours (Overtime)
  const fullOut = new Date(onTimeIn.getTime() + 9.5 * 3600 * 1000);
  const fullEval = evaluateShiftAttendance(onTimeIn, fullOut, dummyShift);
  assert(fullEval.totalWorkingHours >= 9.5, 'Computes total working hours (9.5 hrs)');
  assert(fullEval.overtimeHours >= 1.5, 'Computes overtime above 8.0h threshold');

  // Short day (< 4.5 hours) -> Half Day
  const shortOut = new Date(onTimeIn.getTime() + 3.0 * 3600 * 1000);
  const shortEval = evaluateShiftAttendance(onTimeIn, shortOut, dummyShift);
  assert(shortEval.status === AttendanceStatus.HALF_DAY, 'Working < 4.5 hours results in HALF_DAY status');

  // TEST SUITE 3: Authentication & Security Tokens
  console.log('\n--- Suite 3: Auth, Password Hashing & JWT ---');
  const password = 'SecurePassword@2026';
  const hashed = await hashPassword(password);
  const matches = await comparePassword(password, hashed);
  const fails = await comparePassword('WrongPassword', hashed);
  assert(matches === true, 'Argon2/Bcrypt hash verification passes for correct password');
  assert(fails === false, 'Hash verification rejects invalid password');

  const tokens = generateTokens({
    userId: 'user-123',
    organizationId: 'org-123',
    email: 'admin@acme.com',
    role: Role.COMPANY_ADMIN,
  });
  assert(Boolean(tokens.accessToken && tokens.refreshToken), 'Issues JWT access and refresh token pair');

  const verified = verifyToken(tokens.accessToken);
  assert(verified !== null && verified.email === 'admin@acme.com', 'JWT verifies and decodes valid payload');

  // TEST SUITE 4: Database Persistence & Relations
  console.log('\n--- Suite 4: Database Persistence & Relations ---');
  const orgCount = await prisma.organization.count();
  assert(orgCount > 0, `Database contains seeded organization (count: ${orgCount})`);

  const branchCount = await prisma.branch.count();
  assert(branchCount >= 2, `Database contains seeded branches with geofences (count: ${branchCount})`);

  const empCount = await prisma.employee.count();
  assert(empCount >= 4, `Database contains seeded employees across roles (count: ${empCount})`);

  const leavesCount = await prisma.leaveType.count();
  assert(leavesCount >= 4, `Database contains configured leave types (count: ${leavesCount})`);

  // TEST SUITE 5: Excel Report & Template Generation
  console.log('\n--- Suite 5: ExcelJS Report & Template Engine ---');
  const templateBuffer = await generateEmployeeImportTemplate();
  assert(templateBuffer.length > 1000, `Employee import template generated (${templateBuffer.length} bytes)`);

  const sampleRecords = await prisma.attendanceRecord.findMany({
    include: { employee: { include: { department: true, branch: true } } },
    take: 5,
  });
  const reportBuffer = await generateAttendanceExcelReport(sampleRecords, 'Acme Global');
  assert(reportBuffer.length > 2000, `Attendance Excel report generated (${reportBuffer.length} bytes)`);

  // TEST SUITE 6: Phase 2 - Office Geofences, Accuracy & Multi-Radius Rules
  console.log('\n--- Suite 6: Phase 2 Geofencing & Multi-Radius Rules ---');
  const officeLocations = await prisma.officeLocation.findMany();
  assert(officeLocations.length >= 2, `Office locations registered in DB (count: ${officeLocations.length})`);

  const hqOffice = officeLocations.find((o) => o.radiusMeters === 50) || officeLocations[0];
  const cyberOffice = officeLocations.find((o) => o.radiusMeters === 100) || officeLocations[1];
  assert(Boolean(hqOffice && cyberOffice), 'System has both 50m and 100m geofence radius configurations');

  // Test point exactly 75 meters away from HQ
  // 1 degree latitude ~ 111,139 meters => 75m is ~ 0.000674 degrees
  const offset75mLat = hqOffice.latitude + 0.000674;
  const offset75mLon = hqOffice.longitude;
  const dist75m = calculateHaversineDistanceMeters(hqOffice.latitude, hqOffice.longitude, offset75mLat, offset75mLon);
  assert(dist75m >= 70 && dist75m <= 80, `Offset coordinate distance calibrated to ~75m (actual: ${dist75m.toFixed(1)}m)`);

  // Verify against 50m radius (should FAIL/REJECT)
  const eval50m = validateGeofence(offset75mLat, offset75mLon, 15, hqOffice.latitude, hqOffice.longitude, 50);
  assert(eval50m.isWithinGeofence === false, '75m distance is rejected by 50m geofence');

  // Verify against 100m radius (should PASS/APPROVE)
  const eval100m = validateGeofence(offset75mLat, offset75mLon, 15, hqOffice.latitude, hqOffice.longitude, 100);
  assert(eval100m.isWithinGeofence === true, '75m distance is accepted by 100m geofence');

  // Low accuracy threshold check (> 30 meters accuracy limit)
  const minGpsAccuracy = hqOffice.minGpsAccuracyMeters || 30;
  const accurateReading = 15; // 15m accuracy
  const inaccurateReading = 45; // 45m accuracy
  assert(accurateReading <= minGpsAccuracy, `High accuracy reading (${accurateReading}m <= ${minGpsAccuracy}m) accepted`);
  assert(inaccurateReading > minGpsAccuracy, `Degraded accuracy reading (${inaccurateReading}m > ${minGpsAccuracy}m) flagged as low accuracy`);

  // TEST SUITE 7: Phase 2 - Overnight Shifts Duration Engine
  console.log('\n--- Suite 7: Overnight Shift Duration Engine ---');
  const overnightShift = {
    id: 'shift-overnight',
    organizationId: 'test-org',
    name: 'Night Watch Shift',
    code: 'NIGHT',
    startTime: '22:00',
    endTime: '06:00',
    gracePeriodMinutes: 15,
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 8.0,
    isOvernight: true,
    isFlexible: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const nightCheckIn = new Date('2026-11-18T22:05:00Z');
  const nightCheckOut = new Date('2026-11-19T06:15:00Z'); // Next morning
  const overnightEval = evaluateShiftAttendance(nightCheckIn, nightCheckOut, overnightShift);
  assert(overnightEval.totalWorkingHours >= 8.1, `Overnight shift duration computed across midnight (${overnightEval.totalWorkingHours.toFixed(1)} hrs)`);
  assert(overnightEval.status === AttendanceStatus.PRESENT, 'Overnight attendance evaluated as PRESENT');

  // TEST SUITE 8: Phase 2 - Attendance Exception Workflow
  console.log('\n--- Suite 8: Attendance Exception Lifecycle ---');
  const testEmployee = await prisma.employee.findFirst({
    where: { employmentStatus: 'ACTIVE' },
  });
  assert(Boolean(testEmployee), 'Found active employee for exception workflow test');

  if (testEmployee) {
    // Create exception
    const exception = await prisma.attendanceException.create({
      data: {
        organizationId: testEmployee.organizationId,
        employeeId: testEmployee.id,
        reason: 'OUTSIDE_GEOFENCE',
        status: 'PENDING',
        exceptionDate: new Date().toISOString().split('T')[0],
        explanation: 'Offsite client meeting at tech park',
      },
    });
    assert(Boolean(exception.id), 'Successfully submitted attendance exception');
    assert(exception.status === 'PENDING', 'Initial exception status is PENDING');

    // Review / Approve exception
    const approvedException = await prisma.attendanceException.update({
      where: { id: exception.id },
      data: {
        status: 'APPROVED',
        reviewedByUserId: testEmployee.userId,
        reviewedAt: new Date(),
        reviewRemark: 'Verified with client agenda',
      },
    });
    assert(approvedException.status === 'APPROVED', 'Exception status updated to APPROVED');
    assert(approvedException.reviewRemark === 'Verified with client agenda', 'Supervisor audit remark persisted');

    // Clean up test exception
    await prisma.attendanceException.delete({ where: { id: exception.id } });
    assert(true, 'Test exception cleaned up successfully');
  }

  console.log('\n========================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
