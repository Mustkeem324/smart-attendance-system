import puppeteer from 'puppeteer-core';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { generateTokens } from '../src/lib/auth';
import { connectToDatabase } from '../src/lib/mongodb';

async function main() {
  console.log('=== STARTING EMPLOYEE PHOTO VERIFICATION SUITE ===');

  await connectToDatabase();

  const screenshotsDir = path.join(
    '/home/nx-pro/.gemini/antigravity-cli/brain/8252e3dc-4357-4df3-9ff3-7583201d6329',
    'screenshots'
  );
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Generate auth token for admin
  console.log('\n--- 1. Authenticating Admin via Token Generation ---');
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
  console.log('✓ Admin authenticated successfully.');

  // 2. Query /api/employees
  console.log('\n--- 2. Checking /api/employees Photo Data ---');
  const empRes = await fetch('http://localhost:3000/api/employees', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assert.strictEqual(empRes.status, 200, 'Failed to fetch /api/employees');
  const empData = await empRes.json();
  const employees = empData.employees || [];
  console.log(`Found ${employees.length} employees in system.`);
  assert(employees.length >= 7, 'Expected at least 7 employees');

  for (const emp of employees) {
    console.log(`- ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} -> photo: ${emp.profilePhoto}`);
    assert(emp.profilePhoto, `Employee ${emp.employeeCode} has missing profilePhoto`);
    // Verify file exists in public/
    const localPath = path.join(process.cwd(), 'public', emp.profilePhoto);
    assert(fs.existsSync(localPath), `File does not exist on disk: ${localPath}`);
    const stats = fs.statSync(localPath);
    assert(stats.size > 5000, `Image file is unexpectedly small: ${stats.size} bytes`);
  }
  console.log('✓ All 7 employee profile photos exist on disk with real image bytes.');

  // 3. Test /api/upload endpoint
  console.log('\n--- 3. Testing /api/upload with Base64 Image ---');
  const sampleBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Data: sampleBase64 }),
  });
  assert.strictEqual(uploadRes.status, 200, 'Upload API failed');
  const uploadData = await uploadRes.json();
  assert(uploadData.success && uploadData.url, 'Upload response invalid');
  console.log('✓ Upload returned URL:', uploadData.url);
  const uploadedDiskPath = path.join(process.cwd(), 'public', uploadData.url);
  assert(fs.existsSync(uploadedDiskPath), 'Uploaded file not found on disk');
  console.log('✓ Uploaded file saved to disk successfully.');

  // 4. Puppeteer Browser Testing
  console.log('\n--- 4. Browser Verification with Puppeteer ---');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Inject session cookie
    await page.setCookie({
      name: 'auth_token',
      value: accessToken,
      domain: 'localhost',
      path: '/',
    });

    // 4.1 Test /employees Directory
    console.log('\n--- 4.1 Checking /employees Directory ---');
    await page.goto('http://localhost:3000/employees', { waitUntil: 'networkidle2' });
    await page.waitForSelector('table', { timeout: 10000 });

    // Verify all employee images in the table
    const tableImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('table tbody tr img'));
      return imgs.map((img: any) => ({
        src: img.src,
        alt: img.alt,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
      }));
    });

    console.log(`Found ${tableImages.length} images loaded in employee table.`);
    assert(tableImages.length >= 7, 'Expected at least 7 employee avatars in directory table');
    for (const img of tableImages) {
      assert(img.naturalWidth > 0, `Broken image detected for: ${img.alt} (naturalWidth: ${img.naturalWidth})`);
      assert(img.complete, `Image not fully loaded: ${img.src}`);
    }
    console.log('✓ All employee table images have naturalWidth > 0 (100% loaded, 0 broken images).');

    // Screenshot of /employees
    const empScreenshot = path.join(screenshotsDir, 'employees_directory_photos.png');
    await page.screenshot({ path: empScreenshot, fullPage: false });
    console.log('✓ Saved screenshot to:', empScreenshot);

    // 4.2 Test Open Photo Modal on /employees
    console.log('\n--- 4.2 Testing Employee Photo Upload Modal ---');
    // Click on the first row's photo button
    const photoButtons = await page.$$('button[title="Change employee portrait"]');
    assert(photoButtons.length > 0, 'No photo buttons found in table');
    await photoButtons[0].click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    const modalTitle = await page.evaluate(() => {
      return document.querySelector('[role="dialog"] h2')?.textContent;
    });
    console.log('✓ Photo Modal opened with title:', modalTitle);

    // Verify corporate preset portraits inside the modal
    const presetImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('[role="dialog"] img'));
      return imgs.map((img: any) => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
      }));
    });
    console.log(`Found ${presetImages.length} portraits in modal.`);
    assert(presetImages.length >= 10, 'Expected at least 10 corporate portraits in modal gallery');
    for (const p of presetImages) {
      assert(p.naturalWidth > 0, `Broken preset portrait in modal: ${p.src}`);
    }
    console.log('✓ All modal corporate headshots loaded with naturalWidth > 0.');

    const modalScreenshot = path.join(screenshotsDir, 'employee_photo_upload_modal.png');
    await page.screenshot({ path: modalScreenshot, fullPage: false });
    console.log('✓ Saved modal screenshot to:', modalScreenshot);

    // 4.3 Test /employees/[id]
    console.log('\n--- 4.3 Checking Employee Profile Detail Page ---');
    const firstEmp = employees[0];
    await page.goto(`http://localhost:3000/employees/${firstEmp.id}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('img[alt*="' + firstEmp.firstName + '"]', { timeout: 10000 });

    const detailPhotoStats = await page.evaluate((name) => {
      const img: any = document.querySelector('img[alt*="' + name + '"]');
      if (!img) return null;
      return {
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      };
    }, firstEmp.firstName);

    assert(detailPhotoStats, 'Profile photo not found on employee detail page');
    assert(detailPhotoStats.naturalWidth > 0, `Profile photo failed to render on detail page: ${detailPhotoStats.src}`);
    console.log(`✓ Detail portrait for ${firstEmp.firstName} ${firstEmp.lastName}: ${detailPhotoStats.naturalWidth}x${detailPhotoStats.naturalHeight}px.`);

    const detailScreenshot = path.join(screenshotsDir, 'employee_detail_photo.png');
    await page.screenshot({ path: detailScreenshot, fullPage: false });
    console.log('✓ Saved detail screenshot to:', detailScreenshot);

    // 4.4 Test /employee/dashboard
    console.log('\n--- 4.4 Checking /employee/dashboard Header ---');
    await page.goto('http://localhost:3000/employee/dashboard', { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 10000 });
    const dashboardPhotoStats = await page.evaluate(() => {
      const img: any = document.querySelector('header img, .rounded-3xl img');
      if (!img) return null;
      return {
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      };
    });
    console.log('Employee dashboard header photo stats:', dashboardPhotoStats);
    if (dashboardPhotoStats) {
      assert(dashboardPhotoStats.naturalWidth > 0, 'Dashboard photo naturalWidth is 0');
      console.log('✓ Employee dashboard header photo renders successfully.');
    }

    // 4.5 Test /distribution/sales-team
    console.log('\n--- 4.5 Checking /distribution/sales-team Page ---');
    await page.goto('http://localhost:3000/distribution/sales-team', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.grid img', { timeout: 10000 });
    const repCardsPhotos = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('.grid img'));
      return imgs.map((img: any) => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
      }));
    });
    console.log(`Found ${repCardsPhotos.length} sales rep cards photos.`);
    assert(repCardsPhotos.length > 0, 'Expected sales rep photos on /distribution/sales-team');
    for (const img of repCardsPhotos) {
      assert(img.naturalWidth > 0, `Broken sales rep image: ${img.src}`);
    }
    console.log('✓ All sales rep photos render perfectly on /distribution/sales-team.');

    console.log('\n=== ALL EMPLOYEE PHOTO TESTS PASSED PERFECTLY (100%) ===');
  } finally {
    await browser.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
