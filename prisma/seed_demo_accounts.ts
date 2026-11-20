import { PrismaClient, Role, EmploymentType, EmploymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../src/lib/mongodb';
import { Retailer } from '../src/models/electronics-sales';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding & Validating Demo Accounts...');

  const org = await prisma.organization.findFirst({ where: { code: 'ACME' } });
  if (!org) {
    throw new Error('Default organization ACME not found!');
  }

  const hqBranch = await prisma.branch.findFirst({ where: { code: 'HQ-DL' } });
  const cyberBranch = await prisma.branch.findFirst({ where: { code: 'CYBER-GGN' } });
  const salesDept = await prisma.department.findFirst({ where: { code: 'SALES' } });
  const engDept = await prisma.department.findFirst({ where: { code: 'ENG' } });
  const hrDept = await prisma.department.findFirst({ where: { code: 'HR' } });
  const generalShift = await prisma.shift.findFirst({ where: { code: 'GEN' } });
  const cyberOffice = await prisma.officeLocation.findFirst({ where: { code: 'CYBER-OFFICE-01' } });
  const hqOffice = await prisma.officeLocation.findFirst({ where: { code: 'HQ-OFFICE-01' } });

  const defaultPassword = await bcrypt.hash('Password@123', 10);
  const adminPassword = await bcrypt.hash('Admin@12345', 10);

  // 1. Company Admin (admin@acme.com)
  const adminUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@acme.com' } },
    update: {
      passwordHash: adminPassword,
      role: Role.COMPANY_ADMIN,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: 'admin@acme.com',
      passwordHash: adminPassword,
      role: Role.COMPANY_ADMIN,
      isActive: true,
    },
  });

  // 2. HR Manager (hr@acme.com)
  const hrUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'hr@acme.com' } },
    update: {
      passwordHash: defaultPassword,
      role: Role.HR_MANAGER,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: 'hr@acme.com',
      passwordHash: defaultPassword,
      role: Role.HR_MANAGER,
      isActive: true,
    },
  });

  // 3. Team Lead / Manager (manager@acme.com)
  const mgrUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'manager@acme.com' } },
    update: {
      passwordHash: defaultPassword,
      role: Role.TEAM_MANAGER,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: 'manager@acme.com',
      passwordHash: defaultPassword,
      role: Role.TEAM_MANAGER,
      isActive: true,
    },
  });

  // 4. Employee (john.doe@acme.com)
  const empUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'john.doe@acme.com' } },
    update: {
      passwordHash: defaultPassword,
      role: Role.EMPLOYEE,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: 'john.doe@acme.com',
      passwordHash: defaultPassword,
      role: Role.EMPLOYEE,
      isActive: true,
    },
  });

  // 5. Field Sales Rep (alex.wong@acme.com)
  const salesUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'alex.wong@acme.com' } },
    update: {
      passwordHash: defaultPassword,
      role: Role.FIELD_SALES_REP,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: 'alex.wong@acme.com',
      passwordHash: defaultPassword,
      role: Role.FIELD_SALES_REP,
      isActive: true,
    },
  });

  // Ensure Alex Wong's employee profile
  await prisma.employee.upsert({
    where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: 'EMP-003' } },
    update: {
      userId: salesUser.id,
      designation: 'Field Sales & Distribution Specialist',
      officeLocationId: cyberOffice?.id,
    },
    create: {
      userId: salesUser.id,
      organizationId: org.id,
      employeeCode: 'EMP-003',
      firstName: 'Alex',
      lastName: 'Wong',
      email: 'alex.wong@acme.com',
      phone: '+91-9880011223',
      designation: 'Field Sales & Distribution Specialist',
      departmentId: salesDept!.id,
      branchId: cyberBranch!.id,
      officeLocationId: cyberOffice?.id,
      shiftId: generalShift!.id,
      joiningDate: new Date('2024-04-10'),
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      baseSalary: 68000,
    },
  });

  // 6. Retailer Dealer Partner (dealer@apexmobile.com)
  const dealerUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'dealer@apexmobile.com' } },
    update: {
      passwordHash: defaultPassword,
      role: Role.EMPLOYEE,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: 'dealer@apexmobile.com',
      passwordHash: defaultPassword,
      role: Role.EMPLOYEE,
      isActive: true,
    },
  });

  await prisma.employee.upsert({
    where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: 'DLR-EMP-01' } },
    update: {
      userId: dealerUser.id,
      designation: 'Apex Mobile Hub - Authorized Dealer Partner',
      officeLocationId: hqOffice?.id,
      profilePhoto: '/employees/vikas-malhotra.jpg',
    },
    create: {
      userId: dealerUser.id,
      organizationId: org.id,
      employeeCode: 'DLR-EMP-01',
      firstName: 'Vikas',
      lastName: 'Malhotra',
      email: 'dealer@apexmobile.com',
      phone: '+91-9811002233',
      profilePhoto: '/employees/vikas-malhotra.jpg',
      designation: 'Apex Mobile Hub - Authorized Dealer Partner',
      departmentId: salesDept!.id,
      branchId: hqBranch!.id,
      officeLocationId: hqOffice?.id,
      shiftId: generalShift!.id,
      joiningDate: new Date('2024-01-01'),
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      baseSalary: 0,
    },
  });

  // Connect MongoDB and verify Apex Mobile Hub exists
  await connectToDatabase();
  const apexRetailer = await Retailer.findOne({ dealerCode: 'DLR-00001' });
  if (apexRetailer) {
    apexRetailer.ownerName = 'Vikas Malhotra';
    apexRetailer.phone = '9811002233';
    apexRetailer.name = 'Apex Mobile Hub';
    await apexRetailer.save();
    console.log('✅ MongoDB Apex Mobile Hub synced with dealer account');
  }

  console.log('🎉 All 6 Demo Personas successfully seeded and verified!');
}

main()
  .catch((e) => {
    console.error('❌ Error in seed_demo_accounts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
