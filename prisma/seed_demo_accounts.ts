import { PrismaClient, Role, EmploymentType, EmploymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../src/lib/mongodb';
import { Retailer } from '../src/models/electronics-sales';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Salman Enterprises: 1 ADMIN (Owner/HR/Super Admin) & EXACTLY 7 EMPLOYEES...');

  // 1. Get Organization
  let org = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: 'salman-enterprises' },
        { code: 'SALMAN' },
        { code: 'ACME' },
      ],
    },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Salman Enterprises Distribution Ltd.',
        code: 'SALMAN',
        slug: 'salman-enterprises',
        email: 'salmanenterprisesphu@gmail.com',
      },
    });
  }

  // 2. Ensure Branches
  const delBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'DEL-HUB' } },
    update: { name: 'Salman Enterprises Central Hub - Delhi / NCR' },
    create: {
      organizationId: org.id,
      code: 'DEL-HUB',
      name: 'Salman Enterprises Central Hub - Delhi / NCR',
      address: 'Plot 42, Okhla Industrial Area Phase III, New Delhi',
      city: 'Delhi',
      country: 'India',
      latitude: 28.5355,
      longitude: 77.2732,
      radiusMeters: 100,
    },
  });

  const noidaBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'NOIDA-DC' } },
    update: { name: 'Salman Enterprises Distribution Center - Noida / UP' },
    create: {
      organizationId: org.id,
      code: 'NOIDA-DC',
      name: 'Salman Enterprises Distribution Center - Noida / UP',
      address: 'B-12, Sector 63, Electronic City, Noida',
      city: 'Noida',
      country: 'India',
      latitude: 28.6280,
      longitude: 77.3649,
      radiusMeters: 100,
    },
  });

  // 3. Ensure Shifts
  const genShift = await prisma.shift.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'GEN' } },
    update: { name: 'General Distribution Shift' },
    create: {
      organizationId: org.id,
      code: 'GEN',
      name: 'General Distribution Shift',
      startTime: '09:30',
      endTime: '18:30',
    },
  });

  const mrnShift = await prisma.shift.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'MRN' } },
    update: { name: 'Early Dispatch Shift' },
    create: {
      organizationId: org.id,
      code: 'MRN',
      name: 'Early Dispatch Shift',
      startTime: '08:00',
      endTime: '17:00',
    },
  });

  const fldShift = await prisma.shift.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'FLD' } },
    update: { name: 'Field Sales Flexible Shift' },
    create: {
      organizationId: org.id,
      code: 'FLD',
      name: 'Field Sales Flexible Shift',
      startTime: '10:00',
      endTime: '19:00',
    },
  });

  // 4. Ensure Departments
  const deptMap: Record<string, any> = {};
  const depts = [
    { code: 'SALES', name: 'B2B Sales & Distribution' },
    { code: 'OPS', name: 'Operations & Finance' },
    { code: 'LOG', name: 'Logistics & Warehousing' },
    { code: 'QC', name: 'Quality & Technical Support' },
    { code: 'HR', name: 'Executive & HR Administration' },
  ];

  for (const d of depts) {
    deptMap[d.code] = await prisma.department.upsert({
      where: { organizationId_code: { organizationId: org.id, code: d.code } },
      update: { name: d.name },
      create: {
        organizationId: org.id,
        code: d.code,
        name: d.name,
      },
    });
  }

  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  const employeePassword = await bcrypt.hash('Password@123', 10);

  // 5. 1 ADMIN (Owner / HR / Super Admin)
  const adminEmail = 'salmanenterprisesphu@gmail.com';
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: adminEmail } },
    update: {
      passwordHash: adminPassword,
      phone: '9876543210',
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: adminEmail,
      phone: '9876543210',
      passwordHash: adminPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`👑 1 Admin confirmed: ${adminEmail}`);

  // 6. EXACTLY 7 EMPLOYEES
  const employeesData = [
    {
      code: 'EMP-001',
      firstName: 'Farhan',
      lastName: 'Akhtar',
      email: 'farhan.sales@salmanenterprises.in',
      phone: '9811011221',
      designation: 'Senior B2B Sales Executive (North Zone)',
      deptCode: 'SALES',
      branch: delBranch,
      shift: fldShift,
      role: Role.FIELD_SALES_REP,
      baseSalary: 55000,
      joiningDate: new Date('2024-01-15'),
    },
    {
      code: 'EMP-002',
      firstName: 'Ayesha',
      lastName: 'Siddiqui',
      email: 'ayesha.ops@salmanenterprises.in',
      phone: '9811011222',
      designation: 'Operations & Accounts Executive',
      deptCode: 'OPS',
      branch: delBranch,
      shift: genShift,
      role: Role.EMPLOYEE,
      baseSalary: 48000,
      joiningDate: new Date('2024-02-01'),
    },
    {
      code: 'EMP-003',
      firstName: 'Tariq',
      lastName: 'Mehmood',
      email: 'tariq.warehouse@salmanenterprises.in',
      phone: '9811011223',
      designation: 'Warehouse & Inventory Supervisor',
      deptCode: 'LOG',
      branch: noidaBranch,
      shift: mrnShift,
      role: Role.INVENTORY_MANAGER,
      baseSalary: 45000,
      joiningDate: new Date('2024-02-15'),
    },
    {
      code: 'EMP-004',
      firstName: 'Mohammad',
      lastName: 'Zaid',
      email: 'zaid.field@salmanenterprises.in',
      phone: '9811011224',
      designation: 'Field Sales Representative (South Zone)',
      deptCode: 'SALES',
      branch: noidaBranch,
      shift: fldShift,
      role: Role.FIELD_SALES_REP,
      baseSalary: 42000,
      joiningDate: new Date('2024-03-01'),
    },
    {
      code: 'EMP-005',
      firstName: 'Rehan',
      lastName: 'Shaikh',
      email: 'rehan.logistics@salmanenterprises.in',
      phone: '9811011225',
      designation: 'Logistics & Dispatch Coordinator',
      deptCode: 'LOG',
      branch: noidaBranch,
      shift: genShift,
      role: Role.DELIVERY_AGENT,
      baseSalary: 38000,
      joiningDate: new Date('2024-03-10'),
    },
    {
      code: 'EMP-006',
      firstName: 'Zoya',
      lastName: 'Khan',
      email: 'zoya.support@salmanenterprises.in',
      phone: '9811011226',
      designation: 'Retailer Support & Order Desk Executive',
      deptCode: 'SALES',
      branch: delBranch,
      shift: genShift,
      role: Role.EMPLOYEE,
      baseSalary: 40000,
      joiningDate: new Date('2024-03-20'),
    },
    {
      code: 'EMP-007',
      firstName: 'Bilal',
      lastName: 'Qureshi',
      email: 'bilal.qc@salmanenterprises.in',
      phone: '9811011227',
      designation: 'Hardware Testing & QC Specialist',
      deptCode: 'QC',
      branch: delBranch,
      shift: genShift,
      role: Role.EMPLOYEE,
      baseSalary: 42000,
      joiningDate: new Date('2024-04-01'),
    },
  ];

  for (const empData of employeesData) {
    const empUser = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: empData.email } },
      update: {
        passwordHash: employeePassword,
        phone: empData.phone,
        role: empData.role,
        isActive: true,
      },
      create: {
        organizationId: org.id,
        email: empData.email,
        phone: empData.phone,
        passwordHash: employeePassword,
        role: empData.role,
        isActive: true,
      },
    });

    await prisma.employee.upsert({
      where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: empData.code } },
      update: {
        userId: empUser.id,
        firstName: empData.firstName,
        lastName: empData.lastName,
        email: empData.email,
        phone: empData.phone,
        designation: empData.designation,
        departmentId: deptMap[empData.deptCode].id,
        branchId: empData.branch.id,
        shiftId: empData.shift.id,
        joiningDate: empData.joiningDate,
        employmentType: EmploymentType.FULL_TIME,
        employmentStatus: EmploymentStatus.ACTIVE,
        baseSalary: empData.baseSalary,
      },
      create: {
        userId: empUser.id,
        organizationId: org.id,
        employeeCode: empData.code,
        firstName: empData.firstName,
        lastName: empData.lastName,
        email: empData.email,
        phone: empData.phone,
        designation: empData.designation,
        departmentId: deptMap[empData.deptCode].id,
        branchId: empData.branch.id,
        shiftId: empData.shift.id,
        joiningDate: empData.joiningDate,
        employmentType: EmploymentType.FULL_TIME,
        employmentStatus: EmploymentStatus.ACTIVE,
        baseSalary: empData.baseSalary,
      },
    });
  }

  // 7. Sync MongoDB
  try {
    await connectToDatabase();
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.warn('MongoDB connection note:', err);
  }

  const empCount = await prisma.employee.count({ where: { organizationId: org.id } });
  console.log(`🎉 Done: Verified 1 Admin and exactly ${empCount} Employees.`);
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
