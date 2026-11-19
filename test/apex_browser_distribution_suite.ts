import assert from 'node:assert';
import puppeteer from 'puppeteer-core';
import { prisma } from '../src/lib/prisma';
import { generateTokens } from '../src/lib/auth';
import { connectToDatabase } from '../src/lib/mongodb';
import {
  Retailer,
  SalesOrder,
  Invoice,
  PaymentCollection,
  Inventory,
  Product,
} from '../src/models/electronics-sales';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runBrowserTestSuite() {
  console.log('================================================================');
  console.log('🌐 RUNNING APEX ELECTRONICS BROWSER DISTRIBUTION AUDIT SUITE');
  console.log('================================================================');

  await connectToDatabase();

  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@acme.com' },
    include: { employee: true },
  });
  assert(adminUser, 'Admin user must exist in PostgreSQL');

  const { accessToken } = generateTokens({
    userId: adminUser.id,
    organizationId: adminUser.organizationId,
    email: adminUser.email,
    role: adminUser.role,
    employeeId: adminUser.employee?.id,
  });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  const networkErrors: { url: string; status: number }[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (res) => {
    if (!res.ok() && res.url().includes('/api/')) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  // Inject session cookie
  await page.setCookie({
    name: 'auth_token',
    value: accessToken,
    domain: 'localhost',
    path: '/',
  });

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`, err);
      failed++;
    }
  }

  // 1. Navigation & Auth
  await test('Browser navigates to /distribution with HTTP 200 and loads DOM', async () => {
    await page.setViewport({ width: 1440, height: 900 });
    const response = await page.goto(`${BASE_URL}/distribution`, { waitUntil: 'networkidle0', timeout: 30000 });
    assert(response && response.ok(), 'Page response must be OK');
    await new Promise((r) => setTimeout(r, 1500));
  });

  // 2. Console Title & Subtitle
  await test('Master Console title and live operational status pill render correctly', async () => {
    const title = await page.$eval('h1', (el) => el.innerText);
    assert(title.includes('Apex Distribution Console'), `Expected console title, got: ${title}`);

    const badges = await page.$$eval('.bg-emerald-500\\/10', (elements) => elements.map((el) => el.innerText));
    assert(badges.some((b) => b.includes('Live Operations')), `Expected Live Operations badge, got: ${badges.join(', ')}`);
  });

  // 3. 8 KPI Cards Verification against MongoDB
  await test('8 KPI cards render real persistent MongoDB data', async () => {
    const [dbRetailers, dbOrders, dbInvoices, dbPayments] = await Promise.all([
      Retailer.countDocuments({ status: 'ACTIVE' }),
      SalesOrder.countDocuments(),
      Invoice.find().select('outstandingBalance').lean(),
      PaymentCollection.find().select('amount').lean(),
    ]);

    const kpiTexts = await page.$$eval('.grid-cols-1.sm\\:grid-cols-2 > div', (cards) => {
      return cards.map((c) => ({
        label: c.querySelector('span.text-xs')?.textContent?.trim(),
        value: c.querySelector('.text-2xl')?.textContent?.trim(),
      }));
    });

    assert.strictEqual(kpiTexts.length, 8, 'Must render exactly 8 KPI cards');

    const activeRetailersCard = kpiTexts.find((k) => k.label === 'Active Retailers');
    assert.strictEqual(activeRetailersCard?.value, String(dbRetailers));

    const totalOrdersCard = kpiTexts.find((k) => k.label === 'Total B2B Orders');
    assert.strictEqual(totalOrdersCard?.value, String(dbOrders));

    console.log(`   ↳ Active Retailers: ${activeRetailersCard?.value} | Total B2B Orders: ${totalOrdersCard?.value}`);
  });

  // 4. Trajectory Chart
  await test('Turnover & Collections Trajectory chart renders with dual monthly bars', async () => {
    const chartBars = await page.$$eval('.h-56 .flex-1', (bars) => bars.length);
    assert(chartBars >= 6, `Expected at least 6 monthly bars, got: ${chartBars}`);
  });

  // 5. Brand Performance Split
  await test('Brand sales split card renders top partner brands with progress bars', async () => {
    const brandRows = await page.$$eval('.pt-4.space-y-3 > div', (rows) => rows.length);
    assert(brandRows > 0, 'Must render brand sales distribution rows');
  });

  // 6. Recent B2B Orders Table
  await test('Recent B2B orders table renders populated rows with order numbers and status pills', async () => {
    const rows = await page.$$eval('table tbody tr', (trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim()))
    );
    assert(rows.length > 0, 'Orders table must contain rows');
    assert(rows[0][0].startsWith('ORD-'), `First column should be order number, got: ${rows[0][0]}`);
  });

  // 7. Interactive Dropdown: "New Action"
  await test('Clicking "New Action" dropdown toggles action links menu', async () => {
    const buttons = await page.$$('button');
    let targetBtn = null;
    for (const b of buttons) {
      const text = await b.evaluate((el) => el.innerText);
      if (text.includes('New Action')) {
        targetBtn = b;
        break;
      }
    }
    assert(targetBtn, 'New Action button must exist in header');
    await targetBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    // Verify modal / dropdown appeared
    const menuLinks = await page.$$eval('.absolute.right-0.mt-2 a', (links) => links.map((l) => l.innerText));
    assert(menuLinks.some((l) => l.includes('Create B2B Order')), 'Menu must show Create B2B Order');
    
    // Close dropdown
    await targetBtn.click();
    await new Promise((r) => setTimeout(r, 300));
  });

  // 8. Interactive Dropdown: Notifications Popover
  await test('Clicking Notification bell opens interactive popover', async () => {
    const bellBtn = await page.$('button:has(.lucide-bell)');
    assert(bellBtn, 'Notification bell button must exist');
    await bellBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    const popoverHeading = await page.$eval('.absolute.right-0.mt-2', (el) => el.innerText);
    assert(popoverHeading.includes('Notifications'), 'Popover heading must include Notifications');

    // Close popover
    await bellBtn.click();
  });

  // 9. Interactive Dropdown: User Profile Menu & HRMS/Catalog Switchers
  await test('Clicking User Profile reveals Admin menu with HRMS & Catalog portal switches', async () => {
    const avatar = await page.$('.w-7.h-7.rounded-lg');
    assert(avatar, 'User avatar must exist');
    await avatar.click();
    await new Promise((r) => setTimeout(r, 300));

    const menuContent = await page.$eval('.absolute.right-0.mt-2', (el) => el.innerText);
    assert(menuContent.includes('Switch to HRMS Portal'), 'Must include HRMS Portal link');
    assert(menuContent.includes('Switch to Public Catalog'), 'Must include Public Catalog link');

    // Close menu
    await avatar.click();
  });

  // 10. Database Refresh Button Handshake
  await test('Clicking "Sync DB" refreshes telemetry from /api/v1/dashboard without error', async () => {
    const buttons = await page.$$('button');
    let syncBtn = null;
    for (const b of buttons) {
      const text = await b.evaluate((el) => el.innerText);
      if (text.includes('Sync DB')) {
        syncBtn = b;
        break;
      }
    }
    assert(syncBtn, 'Sync DB button must exist');
    await syncBtn.click();
    await new Promise((r) => setTimeout(r, 1200));
    assert.strictEqual(networkErrors.length, 0, 'No network errors should have occurred during sync');
  });

  // 11. Responsive Layout & Horizontal Overflow Across All 9 Viewports
  const breakpoints = [
    { name: 'Mobile Small', width: 320, height: 568 },
    { name: 'Mobile Medium', width: 360, height: 640 },
    { name: 'Mobile Large', width: 390, height: 844 },
    { name: 'Mobile Extra Large', width: 430, height: 932 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Laptop', width: 1024, height: 768 },
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Desktop Large', width: 1440, height: 900 },
    { name: 'Ultra-Wide', width: 1920, height: 1080 },
  ];

  for (const bp of breakpoints) {
    await test(`Responsive Viewport: ${bp.name} (${bp.width}x${bp.height}) has 0 horizontal overflow`, async () => {
      await page.setViewport({ width: bp.width, height: bp.height });
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        window.dispatchEvent(new Event('resize'));
      });
      await new Promise((r) => setTimeout(r, 400));

      const isOverflowing = await page.evaluate(() => {
        const docScroll = document.documentElement.scrollWidth;
        const innerW = window.innerWidth;
        const bodyScroll = document.body.scrollWidth;
        return docScroll > innerW || bodyScroll > innerW;
      });

      assert.strictEqual(isOverflowing, false, `Horizontal overflow detected at ${bp.name}`);
    });
  }

  // 12. Final Console & Network Error Invariants
  await test('Zero console errors and zero failed network requests throughout complete session', async () => {
    assert.strictEqual(consoleErrors.length, 0, `Detected console errors: ${consoleErrors.join(', ')}`);
    assert.strictEqual(networkErrors.length, 0, `Detected network errors: ${JSON.stringify(networkErrors)}`);
  });

  await browser.close();

  console.log('================================================================');
  console.log(`📊 BROWSER AUDIT SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runBrowserTestSuite().catch((err) => {
  console.error('Fatal Browser Suite Error:', err);
  process.exit(1);
});
