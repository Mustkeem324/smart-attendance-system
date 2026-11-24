import * as fs from 'fs';
import * as path from 'path';

// Load .env BEFORE PrismaClient initialization
if (fs.existsSync(path.resolve(__dirname, '../.env'))) {
  const envConfig = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

import { PrismaClient, Role, EmploymentType, EmploymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up Salman Enterprises: 1 ADMIN (Owner/HR/Super Admin) + EXACTLY 7 EMPLOYEES...');

  // 1. Get or Update Organization
  let org = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: 'salman-enterprises' },
        { code: 'ACME' },
        { code: 'SALMAN' }
      ]
    }
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Salman Enterprises Distribution Ltd.',
        code: 'SALMAN',
        slug: 'salman-enterprises',
        email: 'salmanenterprisesphu@gmail.com',
      }
    });
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: 'Salman Enterprises Distribution Ltd.',
        code: 'SALMAN',
        slug: 'salman-enterprises',
        email: 'salmanenterprisesphu@gmail.com',
      }
    });
  }
  console.log(`✅ Organization confirmed: ${org.name} (${org.id})`);

  // 2. Set up Branches
  const delBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'DEL-HUB' } },
    update: { 
      name: 'Salman Enterprises Central Hub - Delhi / NCR',
      address: 'Plot 42, Okhla Industrial Area Phase III, New Delhi',
      city: 'Delhi',
      latitude: 28.5355,
      longitude: 77.2732,
      radiusMeters: 100,
    },
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
    }
  });

  const noidaBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'NOIDA-DC' } },
    update: { 
      name: 'Salman Enterprises Distribution Center - Noida / UP',
      address: 'B-12, Sector 63, Electronic City, Noida',
      city: 'Noida',
      latitude: 28.6280,
      longitude: 77.3649,
      radiusMeters: 100,
    },
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
    }
  });

  // 3. Set up Departments
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
      }
    });
  }

  // 4. Set up Shifts
  const genShift = await prisma.shift.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'GEN' } },
    update: { name: 'General Distribution Shift', startTime: '09:30', endTime: '18:30' },
    create: {
      organizationId: org.id,
      code: 'GEN',
      name: 'General Distribution Shift',
      startTime: '09:30',
      endTime: '18:30',
    }
  });

  const mrnShift = await prisma.shift.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'MRN' } },
    update: { name: 'Early Dispatch Shift', startTime: '08:00', endTime: '17:00' },
    create: {
      organizationId: org.id,
      code: 'MRN',
      name: 'Early Dispatch Shift',
      startTime: '08:00',
      endTime: '17:00',
    }
  });

  const fldShift = await prisma.shift.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'FLD' } },
    update: { name: 'Field Sales Flexible Shift', startTime: '10:00', endTime: '19:00' },
    create: {
      organizationId: org.id,
      code: 'FLD',
      name: 'Field Sales Flexible Shift',
      startTime: '10:00',
      endTime: '19:00',
    }
  });

  // Common passwords
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const employeePasswordHash = await bcrypt.hash('Password@123', 10);

  // 5. Clean up old ACME demo accounts and their child records
  const oldEmails = [
    'admin@acme.com',
    'superadmin@acme.com',
    'hr@acme.com',
    'manager@acme.com',
    'john.doe@acme.com',
    'sarah.smith@acme.com',
    'alex.wong@acme.com',
    'dealer@apexmobile.com',
  ];

  for (const oldEmail of oldEmails) {
    const oldUser = await prisma.user.findFirst({
      where: { email: oldEmail },
      include: { employee: true }
    });

    if (oldUser) {
      if (oldUser.employee) {
        // delete child relations of old employee
        await prisma.attendanceRecord.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.attendanceEvent.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.attendanceCorrection.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.attendanceException.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.leaveRequest.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.leaveBalance.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.leaveLedger.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.shiftAssignment.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.shiftRosterEntry.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.payrollRecord.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.employeeSalaryAssignment.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.device.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.shopVisit.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.shopAssignment.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.delivery.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.paymentCollection.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.salesTarget.deleteMany({ where: { employeeId: oldUser.employee.id } });
        await prisma.salesRepresentativeProfile.deleteMany({ where: { employeeId: oldUser.employee.id } });
        
        await prisma.employee.delete({ where: { id: oldUser.employee.id } });
      }
      await prisma.auditLog.deleteMany({ where: { userId: oldUser.id } });
      await prisma.notification.deleteMany({ where: { userId: oldUser.id } });
      await prisma.user.delete({ where: { id: oldUser.id } });
      console.log(`🧹 Cleaned up old demo account: ${oldEmail}`);
    }
  }

  // Also clean up any other orphan employee that is not part of the 7
  const validEmployeeCodes = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006', 'EMP-007'];
  const allCurrentEmps = await prisma.employee.findMany();
  for (const emp of allCurrentEmps) {
    if (!validEmployeeCodes.includes(emp.employeeCode)) {
      await prisma.attendanceRecord.deleteMany({ where: { employeeId: emp.id } });
      await prisma.employee.delete({ where: { id: emp.id } });
      console.log(`🧹 Removed extraneous employee record: ${emp.employeeCode} (${emp.email})`);
    }
  }

  // 6. Create / Update the 1 ADMIN (OWNER / HR / SUPER ADMIN)
  const adminEmail = 'salmanenterprisesphu@gmail.com';
  const adminUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: adminEmail } },
    update: {
      passwordHash: adminPasswordHash,
      phone: '9876543210',
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: adminEmail,
      phone: '9876543210',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    }
  });
  console.log(`👑 1 ADMIN created/verified: ${adminUser.email} (Role: ${adminUser.role}, Phone: ${adminUser.phone})`);

  // 7. Create / Update EXACTLY 7 EMPLOYEES
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
    // 1. Create or update user account
    const empUser = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: empData.email } },
      update: {
        passwordHash: employeePasswordHash,
        phone: empData.phone,
        role: empData.role,
        isActive: true,
      },
      create: {
        organizationId: org.id,
        email: empData.email,
        phone: empData.phone,
        passwordHash: employeePasswordHash,
        role: empData.role,
        isActive: true,
      }
    });

    // 2. Create or update employee record
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
      }
    });
    console.log(`👤 Employee seeded: ${empData.code} - ${empData.firstName} ${empData.lastName} (${empData.designation})`);
  }

  // 8. Ensure 1 Retailer Account exists (Retailer role, NOT in employee table)
  const retailerEmail = 'retailer@salmanenterprises.in';
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: retailerEmail } },
    update: {
      passwordHash: employeePasswordHash,
      phone: '9845011223',
      role: Role.RETAILER,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: retailerEmail,
      phone: '9845011223',
      passwordHash: employeePasswordHash,
      role: Role.RETAILER,
      isActive: true,
    }
  });
  console.log(`🏪 Retailer user verified: ${retailerEmail}`);

  // 9. Verification Checks
  const totalEmployees = await prisma.employee.count({ where: { organizationId: org.id } });
  const allUsers = await prisma.user.findMany({
    where: { organizationId: org.id },
    select: { email: true, phone: true, role: true, employee: { select: { employeeCode: true, designation: true } } }
  });

  console.log('----------------------------------------------------');
  console.log(`🎯 TOTAL EMPLOYEES IN DATABASE: ${totalEmployees} (EXACTLY 7 REQUIRED)`);
  console.log(`👥 TOTAL USERS IN DATABASE: ${allUsers.length}`);
  for (const u of allUsers) {
    console.log(`  - ${u.email} | Phone: ${u.phone} | Role: ${u.role} | Emp: ${u.employee ? `${u.employee.employeeCode} (${u.employee.designation})` : 'NONE (Admin/Retailer)'}`);
  }
  console.log('----------------------------------------------------');

  // 10. Update MongoDB notifications / logs if connected
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      const db = mongoose.connection.db;
      await db.collection('websitecontents').updateMany(
        {},
        {
          $set: {
            companyName: 'Salman Enterprises Distribution Ltd.',
            contactEmail: 'salmanenterprisesphu@gmail.com',
            supportEmail: 'contact@salmanenterprises.in',
            adminEmail: 'salmanenterprisesphu@gmail.com'
          }
        }
      );
      console.log('✅ MongoDB website contents updated with Salman Enterprises admin details');
    } catch (mErr) {
      console.warn('MongoDB sync warning:', mErr);
    }
  }

  console.log('🎉 Setup successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error executing script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(0);
  });
