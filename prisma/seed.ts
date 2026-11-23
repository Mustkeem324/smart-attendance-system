import { PrismaClient, Role, EmploymentType, EmploymentStatus, AttendanceStatus, EventType, RequestStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Phase 2...');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { code: 'ACME' },
    update: {},
    create: {
      name: 'Acme Global Technologies Inc.',
      code: 'ACME',
      slug: 'acme-global',
      email: 'contact@acmeglobal.com',
      phone: '+1-800-555-0199',
      address: 'Tech Innovation Park, Tower B, Silicon Valley, CA / Cyber City',
      settings: {
        defaultGeofenceRadius: 50,
        enforceSelfie: true,
        enforceGeofence: true,
        allowMockLocation: false,
        maxLateGraceMinutes: 15,
        halfDayHours: 4.5,
        fullDayHours: 8.0,
      },
    },
  });

  console.log('✅ Organization created:', org.name);

  // 2. Create Branches
  const hqBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'HQ-DL' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Acme Global HQ - Tech Park',
      code: 'HQ-DL',
      address: 'Building 4, Sector 62, Innovation Zone',
      city: 'Delhi NCR',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.2090,
      radiusMeters: 50,
      timezone: 'Asia/Kolkata',
    },
  });

  const cyberBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CYBER-GGN' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Acme Cyber Hub Campus',
      code: 'CYBER-GGN',
      address: 'Tower C, DLF Cyber City, Phase II',
      city: 'Gurugram',
      country: 'India',
      latitude: 28.4900,
      longitude: 77.0900,
      radiusMeters: 100,
      timezone: 'Asia/Kolkata',
    },
  });

  // 2B. Create Specific Office Locations (Phase 2)
  const hqOffice = await prisma.officeLocation.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'HQ-OFFICE-01' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: hqBranch.id,
      name: 'HQ Innovation Tower - Floor 4 & 5',
      code: 'HQ-OFFICE-01',
      address: 'Suite 400, Building 4, Sector 62, Innovation Zone, Delhi NCR',
      latitude: 28.6139,
      longitude: 77.2090,
      radiusMeters: 50,
      minGpsAccuracyMeters: 30,
      allowedTimeWindows: '06:00-23:00',
      isActive: true,
    },
  });

  const cyberOffice = await prisma.officeLocation.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CYBER-OFFICE-01' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: cyberBranch.id,
      name: 'Cyber City Suite 800 Development Center',
      code: 'CYBER-OFFICE-01',
      address: 'Level 8, Tower C, DLF Cyber City, Phase II, Gurugram',
      latitude: 28.4900,
      longitude: 77.0900,
      radiusMeters: 100,
      minGpsAccuracyMeters: 35,
      allowedTimeWindows: '06:00-23:59',
      isActive: true,
    },
  });

  console.log('✅ Office Locations created:', hqOffice.name, ',', cyberOffice.name);

  // 3. Create Departments
  const engDept = await prisma.department.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'ENG' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Engineering & Development',
      code: 'ENG',
      description: 'Software development, DevOps, and cloud systems',
    },
  });

  const hrDept = await prisma.department.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'HR' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Human Resources & Talent',
      code: 'HR',
      description: 'People operations, recruitment, and attendance management',
    },
  });

  const salesDept = await prisma.department.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SALES' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Sales & Client Relations',
      code: 'SALES',
      description: 'Global business development and customer success',
    },
  });

  // 4. Create Shifts
  const generalShift = await prisma.shift.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'GEN' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'General Corporate Shift',
      code: 'GEN',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
      halfDayThresholdHours: 4.5,
      fullDayThresholdHours: 8.0,
      isOvernight: false,
    },
  });

  const morningShift = await prisma.shift.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'MRN' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Early Morning Shift',
      code: 'MRN',
      startTime: '07:00',
      endTime: '16:00',
      gracePeriodMinutes: 15,
      halfDayThresholdHours: 4.5,
      fullDayThresholdHours: 8.0,
      isOvernight: false,
    },
  });

  const nightShift = await prisma.shift.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'NGT' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Global Support Night Shift',
      code: 'NGT',
      startTime: '22:00',
      endTime: '07:00',
      gracePeriodMinutes: 15,
      halfDayThresholdHours: 4.5,
      fullDayThresholdHours: 8.0,
      isOvernight: true,
    },
  });

  // 5. Create Leave Types
  const clLeave = await prisma.leaveType.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CL' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Casual Leave',
      code: 'CL',
      description: 'Leaves for personal matters or emergencies',
      maxDaysPerYear: 12,
      isPaid: true,
    },
  });

  const slLeave = await prisma.leaveType.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SL' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Sick Leave',
      code: 'SL',
      description: 'Medical and health related leaves',
      maxDaysPerYear: 10,
      isPaid: true,
      requiresAttachment: true,
    },
  });

  const elLeave = await prisma.leaveType.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'EL' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Earned / Privilege Leave',
      code: 'EL',
      description: 'Planned annual holidays',
      maxDaysPerYear: 15,
      isPaid: true,
    },
  });

  const wfhLeave = await prisma.leaveType.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WFH' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Work From Home Request',
      code: 'WFH',
      description: 'Approved remote work day',
      maxDaysPerYear: 24,
      isPaid: true,
    },
  });

  // 6. Create Holidays
  const holidaysData = [
    { name: 'New Year Day', date: '2026-01-01', description: 'Public Holiday' },
    { name: 'Republic Day', date: '2026-01-26', description: 'National Holiday' },
    { name: 'Holi Festival', date: '2026-03-04', description: 'Spring Festival' },
    { name: 'Labor Day', date: '2026-05-01', description: 'International Workers Day' },
    { name: 'Independence Day', date: '2026-08-15', description: 'National Holiday' },
    { name: 'Gandhi Jayanti', date: '2026-10-02', description: 'National Holiday' },
    { name: 'Diwali Festival', date: '2026-11-08', description: 'Festival of Lights' },
    { name: 'Christmas Day', date: '2026-12-25', description: 'Christian Holiday' },
  ];

  for (const h of holidaysData) {
    await prisma.holiday.upsert({
      where: { organizationId_date_name: { organizationId: org.id, date: h.date, name: h.name } },
      update: {},
      create: {
        organizationId: org.id,
        name: h.name,
        date: h.date,
        description: h.description,
      },
    });
  }

  // 7. Create Users & Employees
  const defaultPassword = await bcrypt.hash('Password@123', 10);
  const adminPassword = await bcrypt.hash('Admin@12345', 10);

  // Super Admin
  const superAdminUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'superadmin@acme.com' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'superadmin@acme.com',
      passwordHash: adminPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  // Company Admin
  const adminUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@acme.com' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@acme.com',
      passwordHash: adminPassword,
      role: Role.COMPANY_ADMIN,
    },
  });

  const adminEmployee = await prisma.employee.upsert({
    where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: 'ADM-001' } },
    update: { officeLocationId: hqOffice.id, profilePhoto: '/employees/arthur-pendelton.jpg' },
    create: {
      userId: adminUser.id,
      organizationId: org.id,
      employeeCode: 'ADM-001',
      firstName: 'Arthur',
      lastName: 'Pendelton',
      email: 'admin@acme.com',
      phone: '+1-555-0101',
      profilePhoto: '/employees/arthur-pendelton.jpg',
      designation: 'Managing Director & VP',
      departmentId: hrDept.id,
      branchId: hqBranch.id,
      officeLocationId: hqOffice.id,
      shiftId: generalShift.id,
      joiningDate: new Date('2022-01-10'),
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      baseSalary: 120000,
    },
  });

  // HR Manager
  const hrUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'hr@acme.com' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'hr@acme.com',
      passwordHash: defaultPassword,
      role: Role.HR_MANAGER,
    },
  });

  const hrEmployee = await prisma.employee.upsert({
    where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: 'HR-001' } },
    update: { officeLocationId: hqOffice.id, profilePhoto: '/employees/elena-rostova.jpg' },
    create: {
      userId: hrUser.id,
      organizationId: org.id,
      employeeCode: 'HR-001',
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'hr@acme.com',
      phone: '+1-555-0102',
      profilePhoto: '/employees/elena-rostova.jpg',
      designation: 'HR Lead & Talent Director',
      departmentId: hrDept.id,
      branchId: hqBranch.id,
      officeLocationId: hqOffice.id,
      shiftId: generalShift.id,
      managerId: adminEmployee.id,
      joiningDate: new Date('2023-03-15'),
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      baseSalary: 85000,
    },
  });

  // Team Manager
  const mgrUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'manager@acme.com' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'manager@acme.com',
      passwordHash: defaultPassword,
      role: Role.TEAM_MANAGER,
    },
  });

  const mgrEmployee = await prisma.employee.upsert({
    where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: 'MGR-001' } },
    update: { officeLocationId: hqOffice.id, profilePhoto: '/employees/marcus-vance.jpg' },
    create: {
      userId: mgrUser.id,
      organizationId: org.id,
      employeeCode: 'MGR-001',
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'manager@acme.com',
      phone: '+1-555-0103',
      profilePhoto: '/employees/marcus-vance.jpg',
      designation: 'Engineering Team Lead',
      departmentId: engDept.id,
      branchId: hqBranch.id,
      officeLocationId: hqOffice.id,
      shiftId: generalShift.id,
      managerId: adminEmployee.id,
      joiningDate: new Date('2023-06-01'),
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      baseSalary: 95000,
    },
  });

  // Employee 1: John Doe
  const emp1User = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'john.doe@acme.com' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'john.doe@acme.com',
      passwordHash: defaultPassword,
      role: Role.EMPLOYEE,
    },
  });

  const emp1 = await prisma.employee.upsert({
    where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: 'EMP-001' } },
    update: { officeLocationId: hqOffice.id, profilePhoto: '/employees/john-doe.jpg' },
    create: {
      userId: emp1User.id,
      organizationId: org.id,
      employeeCode: 'EMP-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@acme.com',
      phone: '+1-555-0111',
      profilePhoto: '/employees/john-doe.jpg',
      designation: 'Senior Full Stack Engineer',
      departmentId: engDept.id,
      branchId: hqBranch.id,
      officeLocationId: hqOffice.id,
      shiftId: generalShift.id,
      managerId: mgrEmployee.id,
      joiningDate: new Date('2024-01-15'),
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      weeklyOff: 'SUNDAY',
      baseSalary: 75000,
    },
  });

  // Employee 2: Sarah Smith
  const emp2User = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'sarah.smith@acme.com' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'sarah.smith@acme.com',
      passwordHash: defaultPassword,
      role: Role.EMPLOYEE,
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: 'EMP-002' } },
    update: { officeLocationId: hqOffice.id, profilePhoto: '/employees/sarah-smith.jpg' },
    create: {
      userId: emp2User.id,
      organizationId: org.id,
      employeeCode: 'EMP-002',
      firstName: 'Sarah',
      lastName: 'Smith',
      email: 'sarah.smith@acme.com',
      phone: '+1-555-0112',
      profilePhoto: '/employees/sarah-smith.jpg',
      designation: 'UI/UX Design Lead',
      departmentId: engDept.id,
      branchId: hqBranch.id,
      officeLocationId: hqOffice.id,
      shiftId: generalShift.id,
      managerId: mgrEmployee.id,
      joiningDate: new Date('2024-02-01'),
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      weeklyOff: 'SATURDAY,SUNDAY',
      baseSalary: 72000,
    },
  });

  // Employee 3: Alex Wong
  const emp3User = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'alex.wong@acme.com' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'alex.wong@acme.com',
      passwordHash: defaultPassword,
      role: Role.EMPLOYEE,
    },
  });

  const emp3 = await prisma.employee.upsert({
    where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: 'EMP-003' } },
    update: { officeLocationId: cyberOffice.id, profilePhoto: '/employees/alex-wong.jpg' },
    create: {
      userId: emp3User.id,
      organizationId: org.id,
      employeeCode: 'EMP-003',
      firstName: 'Alex',
      lastName: 'Wong',
      email: 'alex.wong@acme.com',
      phone: '+1-555-0113',
      profilePhoto: '/employees/alex-wong.jpg',
      designation: 'Enterprise Account Executive',
      departmentId: salesDept.id,
      branchId: cyberBranch.id,
      officeLocationId: cyberOffice.id,
      shiftId: morningShift.id,
      managerId: adminEmployee.id,
      joiningDate: new Date('2024-04-10'),
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      weeklyOff: 'SUNDAY',
      baseSalary: 68000,
    },
  });

  // 8. Initialize Leave Balances
  const allEmployees = [adminEmployee, hrEmployee, mgrEmployee, emp1, emp2, emp3];
  const allLeaveTypes = [clLeave, slLeave, elLeave, wfhLeave];
  const currentYear = new Date().getFullYear();

  for (const emp of allEmployees) {
    for (const lt of allLeaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          year: currentYear,
          totalQuota: lt.maxDaysPerYear,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: lt.maxDaysPerYear,
        },
      });
    }
  }

  // 9. Create Sample Attendance Records
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIn = new Date();
  todayCheckIn.setHours(9, 2, 0, 0);

  const todayRecord = await prisma.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: emp1.id, date: todayStr } },
    update: { officeLocationId: hqOffice.id },
    create: {
      organizationId: org.id,
      employeeId: emp1.id,
      officeLocationId: hqOffice.id,
      date: todayStr,
      checkInTime: todayCheckIn,
      status: AttendanceStatus.PRESENT,
      isVerified: true,
      checkInLatitude: 28.61391,
      checkInLongitude: 77.20902,
      checkInAccuracy: 12.5,
      checkInDistanceMeters: 2.8,
      checkInWithinGeofence: true,
      checkInPhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="%233b82f6"/></svg>',
    },
  });

  await prisma.attendanceEvent.create({
    data: {
      attendanceRecordId: todayRecord.id,
      employeeId: emp1.id,
      officeLocationId: hqOffice.id,
      eventType: EventType.CHECK_IN,
      timestamp: todayCheckIn,
      latitude: 28.61391,
      longitude: 77.20902,
      accuracy: 12.5,
      distanceMeters: 2.8,
      isWithinGeofence: true,
      isMockDetected: false,
    },
  });

  // Sample Attendance Exception Request (Phase 2)
  await prisma.attendanceException.create({
    data: {
      organizationId: org.id,
      employeeId: emp3.id,
      exceptionDate: todayStr,
      reason: 'OUTSIDE_GEOFENCE',
      explanation: 'On-site enterprise client workshop at DLF Cyber Park, outside registered office geofence.',
      status: RequestStatus.PENDING,
    },
  });

  console.log('🎉 Phase 2 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
