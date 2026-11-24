import assert from 'assert';
import { prisma } from '../src/lib/prisma';
import { connectToDatabase } from '../src/lib/mongodb';
import { Retailer, Product, RetailerInquiry, ContactInquiry } from '../src/models/electronics-sales';
import { comparePassword, generateTokens } from '../src/lib/auth';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING DEMO ACCOUNTS, B2B WEBSITE & MOBILE UI TEST SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. Verify 1 Admin and 7 Employees in PostgreSQL
  await test('PostgreSQL Salman Enterprises Accounts Verification', async () => {
    // 1 Admin (Owner/HR/Super Admin)
    const adminUser = await prisma.user.findFirst({
      where: { email: 'salmanenterprisesphu@gmail.com' },
      include: { organization: true },
    });
    assert(adminUser, 'Admin salmanenterprisesphu@gmail.com not found in database');
    assert.strictEqual(adminUser.role, 'SUPER_ADMIN', 'Admin role must be SUPER_ADMIN');
    assert(await comparePassword('Admin@12345', adminUser.passwordHash), 'Admin password invalid');

    // Exactly 7 Employees
    const totalEmployees = await prisma.employee.count();
    assert.strictEqual(totalEmployees, 7, `Expected exactly 7 employees, found ${totalEmployees}`);

    const employeeAccounts = [
      { email: 'farhan.sales@salmanenterprises.in', pass: 'Password@123', code: 'EMP-001' },
      { email: 'ayesha.ops@salmanenterprises.in', pass: 'Password@123', code: 'EMP-002' },
      { email: 'tariq.warehouse@salmanenterprises.in', pass: 'Password@123', code: 'EMP-003' },
      { email: 'zaid.field@salmanenterprises.in', pass: 'Password@123', code: 'EMP-004' },
      { email: 'rehan.logistics@salmanenterprises.in', pass: 'Password@123', code: 'EMP-005' },
      { email: 'zoya.support@salmanenterprises.in', pass: 'Password@123', code: 'EMP-006' },
      { email: 'bilal.qc@salmanenterprises.in', pass: 'Password@123', code: 'EMP-007' },
    ];

    for (const acc of employeeAccounts) {
      const user = await prisma.user.findFirst({
        where: { email: acc.email },
        include: { employee: true, organization: true },
      });
      assert(user, `User ${acc.email} not found in database`);
      const validPass = await comparePassword(acc.pass, user.passwordHash);
      assert(validPass, `Password verification failed for ${acc.email}`);
      assert(user.employee, `Employee record missing for ${acc.email}`);
      assert.strictEqual(user.employee.employeeCode, acc.code, `Employee code mismatch for ${acc.email}`);
    }
  });

  // 2. Test Live HTTP Auth Login for Admin and Employees
  await test('HTTP POST /api/auth/login for Salman Enterprises Admin & Employees', async () => {
    const testAccounts = [
      { email: 'salmanenterprisesphu@gmail.com', pass: 'Admin@12345' },
      { email: 'farhan.sales@salmanenterprises.in', pass: 'Password@123' },
      { email: 'ayesha.ops@salmanenterprises.in', pass: 'Password@123' },
      { email: 'retailer@salmanenterprises.in', pass: 'Password@123' },
    ];

    for (const acc of testAccounts) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.pass }),
      });
      assert(res.ok, `HTTP login failed for ${acc.email}: ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.token, `JWT token missing for ${acc.email}`);
      assert.strictEqual(data.user.email, acc.email);
    }
  });

  // 3. Test Public Website Company Info Endpoint
  await test('GET /api/public/company-info returns verified metadata', async () => {
    const res = await fetch(`${BASE_URL}/api/public/company-info`);
    assert(res.ok, `GET /api/public/company-info returned ${res.status}`);
    const data = await res.json();
    assert(data.content, 'Content object missing');
    assert(data.content.companyName, 'Company name missing');
    assert(data.liveStats, 'Live statistics missing');
    assert(data.liveStats.retailerNetwork >= 0, 'Retailer network stat invalid');
  });

  // 4. Test Public Retailer Inquiry Submission
  await test('POST /api/public/retailer-inquiry saves inquiry in MongoDB', async () => {
    const testInquiry = {
      businessName: 'Ultra Mobile World ' + Date.now(),
      ownerName: 'Sanjay Gupta',
      phone: '9876543210',
      email: `sanjay.${Date.now()}@ultramobile.com`,
      city: 'Hyderabad',
      state: 'Telangana',
      businessType: 'MOBILE_RETAILER',
      gstin: '36AABCT1234Z1ZQ',
      interestedCategories: ['SMARTPHONES', 'CHARGERS'],
      message: 'Interested in B2B dealership with initial trial order of 50 units.',
    };

    const res = await fetch(`${BASE_URL}/api/public/retailer-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testInquiry),
    });
    assert(res.ok, `Retailer inquiry returned status ${res.status}`);
    const data = await res.json();
    assert(data.success, 'Expected success: true');
    assert(data.inquiryNumber, 'Inquiry tracking number missing');

    await connectToDatabase();
    const saved = await RetailerInquiry.findOne({ email: testInquiry.email });
    assert(saved, 'Inquiry was not persisted to MongoDB');
    assert.strictEqual(saved.businessName, testInquiry.businessName);
  });

  // 5. Test Public Corporate Contact Inquiry
  await test('POST /api/public/contact-inquiry saves message in MongoDB', async () => {
    const testContact = {
      name: 'Rohan Sharma',
      email: `rohan.${Date.now()}@brandpartner.com`,
      phone: '9123456780',
      subject: 'Brand Distribution Agreement',
      message: 'Looking to onboard new GaN charging brand into your regional fulfillment network.',
    };

    const res = await fetch(`${BASE_URL}/api/public/contact-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testContact),
    });
    assert(res.ok, `Contact inquiry returned status ${res.status}`);
    const data = await res.json();
    assert(data.success, 'Expected success: true');

    await connectToDatabase();
    const saved = await ContactInquiry.findOne({ email: testContact.email });
    assert(saved, 'Contact inquiry was not saved in MongoDB');
    assert.strictEqual(saved.name, testContact.name);
  });

  // 6. Test Public Homepage HTML Delivery
  await test('GET / returns 200 OK with rich UI tags', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.ok, `GET / failed with ${res.status}`);
    const html = await res.text();
    assert(html.includes('APEX ELECTRONICS') || html.includes('Distribution'), 'Brand missing in HTML');
    assert(html.includes('calculator') || html.includes('Calculator'), 'Calculator anchor missing');
  });

  // 7. Test Login Page HTML Delivery
  await test('GET /login returns 200 OK with Enterprise Sign In Portal', async () => {
    const res = await fetch(`${BASE_URL}/login`);
    assert(res.ok, `GET /login failed with ${res.status}`);
    const html = await res.text();
    assert(html.includes('Enterprise Portal Login') || html.includes('Sign In to Platform'), 'Sign in portal missing from login page');
  });

  console.log('================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((e) => {
  console.error(e);
  process.exit(1);
});
