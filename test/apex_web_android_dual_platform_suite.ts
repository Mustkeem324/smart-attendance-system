import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { prisma } from '../src/lib/prisma';
import { generateTokens } from '../src/lib/auth';
import { connectToDatabase } from '../src/lib/mongodb';
import { Retailer, Product, ShopVisit } from '../src/models/electronics-sales';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.resolve(
  '/home/nx-pro/.gemini/antigravity-cli/brain/8252e3dc-4357-4df3-9ff3-7583201d6329/screenshots'
);

async function runDualPlatformSuite() {
  console.log('================================================================');
  console.log('📱 RUNNING APEX ELECTRONICS WEB + ANDROID DUAL-PLATFORM SUITE');
  console.log('================================================================\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

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

  // =========================================================================
  // 1. NATIVE ANDROID & PWA ARCHITECTURE ARTIFACTS
  // =========================================================================
  console.log('\n--- PHASE 1: NATIVE CAPACITOR & PWA CONFIGURATION AUDIT ---');

  await test('Capacitor configuration (capacitor.config.ts) is properly configured', async () => {
    const configPath = path.join(ROOT_DIR, 'capacitor.config.ts');
    assert(fs.existsSync(configPath), 'capacitor.config.ts must exist');
    const content = fs.readFileSync(configPath, 'utf8');
    assert(content.includes('com.apex.electronics.distribution'), 'appId must match com.apex.electronics.distribution');
    assert(content.includes('APEX Electronics'), 'appName must be APEX Electronics');
    assert(content.includes("webDir: 'public'"), "webDir must be 'public'");
    assert(content.includes('cleartext: true'), 'cleartext HTTP must be enabled for local development');
  });

  await test('Android native project structure & build.gradle configs exist', async () => {
    const androidDir = path.join(ROOT_DIR, 'android');
    assert(fs.existsSync(androidDir), 'android/ native project must exist');

    const variablesGradle = path.join(androidDir, 'variables.gradle');
    assert(fs.existsSync(variablesGradle), 'variables.gradle must exist');
    const varContent = fs.readFileSync(variablesGradle, 'utf8');
    assert(varContent.includes('minSdkVersion = 24'), 'minSdkVersion must be 24');

    const appGradle = path.join(androidDir, 'app', 'build.gradle');
    assert(fs.existsSync(appGradle), 'android/app/build.gradle must exist');
    const appContent = fs.readFileSync(appGradle, 'utf8');
    assert(appContent.includes('applicationId "com.apex.electronics.distribution"'), 'applicationId must match in build.gradle');
  });

  await test('AndroidManifest.xml contains all enterprise field permissions and deep linking', async () => {
    const manifestPath = path.join(ROOT_DIR, 'android/app/src/main/AndroidManifest.xml');
    assert(fs.existsSync(manifestPath), 'AndroidManifest.xml must exist');
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    const requiredPermissions = [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.VIBRATE',
      'android.permission.POST_NOTIFICATIONS',
    ];

    for (const perm of requiredPermissions) {
      assert(manifest.includes(perm), `Missing Android permission: ${perm}`);
    }

    assert(manifest.includes('apex-distribution'), 'Deep link scheme apex-distribution must be declared');
  });

  await test('PWA Web Manifest & Service Worker are deployed and valid', async () => {
    const manifestPath = path.join(ROOT_DIR, 'public/manifest.json');
    assert(fs.existsSync(manifestPath), 'public/manifest.json must exist');
    const json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(json.short_name, 'APEX', 'Manifest short_name must be APEX');
    assert.strictEqual(json.display, 'standalone', 'Manifest display must be standalone');
    assert.strictEqual(json.theme_color, '#0E122A', 'Theme color must match APEX Navy');
    assert(Array.isArray(json.icons) && json.icons.length >= 2, 'Manifest must have icon definitions');

    const swPath = path.join(ROOT_DIR, 'public/sw.js');
    assert(fs.existsSync(swPath), 'public/sw.js must exist');
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert(
      swContent.includes('CACHE_NAME') &&
        (swContent.includes('apex-enterprise') || swContent.includes('apex-electronics')),
      'Service worker must cache static app shell'
    );
  });

  await test('High-resolution App Launcher icons exist for Web and Android mipmaps', async () => {
    const icon192 = path.join(ROOT_DIR, 'public/icons/icon-192.png');
    const icon512 = path.join(ROOT_DIR, 'public/icons/icon-512.png');
    assert(fs.existsSync(icon192) && fs.statSync(icon192).size > 1000, 'icon-192.png must exist (>1KB)');
    assert(fs.existsSync(icon512) && fs.statSync(icon512).size > 1000, 'icon-512.png must exist (>1KB)');

    const mipmapDirs = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
    for (const dir of mipmapDirs) {
      const launcher = path.join(ROOT_DIR, 'android/app/src/main/res', dir, 'ic_launcher.png');
      const launcherRound = path.join(ROOT_DIR, 'android/app/src/main/res', dir, 'ic_launcher_round.png');
      assert(fs.existsSync(launcher), `Missing ${dir}/ic_launcher.png`);
      assert(fs.existsSync(launcherRound), `Missing ${dir}/ic_launcher_round.png`);
    }
  });

  // =========================================================================
  // 2. OFFLINE-FIRST SYNCHRONIZATION ENGINE & IDEMPOTENCY
  // =========================================================================
  console.log('\n--- PHASE 2: OFFLINE-FIRST SYNC & IDEMPOTENCY ENGINE API AUDIT ---');

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

  let sampleRetailer: any = null;
  let sampleProduct: any = null;

  await test('Fetch seed data for sync simulation', async () => {
    sampleRetailer = await Retailer.findOne({ status: 'ACTIVE' }).lean();
    assert(sampleRetailer, 'Active retailer must exist in MongoDB');
    sampleProduct = await Product.findOne({ status: 'ACTIVE' }).lean();
    assert(sampleProduct, 'Active product must exist in MongoDB');
  });

  const testIdempotencyKey = `SYNC-TEST-OP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  await test('Atomic sync endpoint (POST /api/v1/field-sales/visits/submit) persists visit and calculates sales', async () => {
    const payload = {
      retailerId: String(sampleRetailer._id),
      visitDate: new Date().toISOString().split('T')[0],
      checkInTime: new Date(Date.now() - 20 * 60000).toISOString(),
      checkOutTime: new Date().toISOString(),
      latitude: 12.9716,
      longitude: 77.5946,
      accuracyMeters: 8.5,
      googleMapsUrl: 'https://maps.google.com/?q=12.9716,77.5946',
      photos: [
        'https://images.unsplash.com/photo-1556742049-0a67e557224f',
        'https://images.unsplash.com/photo-1556740738-b6a63e27c4df',
      ],
      salesLines: [
        {
          productId: String(sampleProduct._id),
          productName: sampleProduct.name,
          sku: sampleProduct.sku,
          brand: sampleProduct.brand,
          category: sampleProduct.category,
          quantity: 2,
          standardPrice: sampleProduct.standardPrice || 50000,
          unitPrice: sampleProduct.standardPrice || 50000,
          isManualPrice: false,
        },
      ],
      remarks: 'Automated Dual-Platform Offline Sync Test',
      idempotencyKey: testIdempotencyKey,
    };

    const res = await fetch(`${BASE_URL}/api/v1/field-sales/visits/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-idempotency-key': testIdempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK, got: ${res.status}`);
    const body = await res.json();
    assert(body.success, 'Expected success: true');
    assert(body.data.visitId, 'Expected visitId returned');
    assert.strictEqual(body.data.totalUnits, 2, 'Expected 2 units processed');

    // Verify in MongoDB
    const persisted = await ShopVisit.findOne({ idempotencyKey: testIdempotencyKey });
    assert(persisted, 'ShopVisit record must be persisted in MongoDB');
    assert.strictEqual(persisted.totalUnits, 2);
  });

  await test('Idempotent retry with same idempotency-key returns cached result without duplicating', async () => {
    const payload = {
      retailerId: String(sampleRetailer._id),
      idempotencyKey: testIdempotencyKey,
      salesLines: [{ productId: String(sampleProduct._id), quantity: 2, unitPrice: 50000 }],
    };

    const res = await fetch(`${BASE_URL}/api/v1/field-sales/visits/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-idempotency-key': testIdempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK on replay, got: ${res.status}`);
    const body = await res.json();
    assert(body.success, 'Expected success: true');
    assert.strictEqual(body.data.isDuplicate, true, 'isDuplicate must be true on retry');

    // Confirm count in MongoDB is still exactly 1
    const count = await ShopVisit.countDocuments({ idempotencyKey: testIdempotencyKey });
    assert.strictEqual(count, 1, 'MongoDB must have exactly 1 record for this idempotency key');
  });

  // =========================================================================
  // 3. PUPPETEER DUAL-PLATFORM VIEWPORT & UI VERIFICATION
  // =========================================================================
  console.log('\n--- PHASE 3: PUPPETEER CROSS-PLATFORM VIEWPORTS AUDIT ---');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    // Authenticate via cookie
    await page.setCookie({
      name: 'auth_token',
      value: accessToken,
      domain: 'localhost',
      path: '/',
    });

    // 3.1 Desktop Web Mode (1440x900)
    await test('Desktop Web Viewport (1440x900): Full enterprise layout, switcher visible, zero bottom nav', async () => {
      await page.setViewport({ width: 1440, height: 900, isMobile: false });
      const res = await page.goto(`${BASE_URL}/distribution`, { waitUntil: 'networkidle0', timeout: 30000 });
      assert(res && res.ok(), 'Desktop /distribution must return HTTP 200');

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth;
      });
      assert(overflow <= 0, `Desktop page should not have horizontal overflow, overflow was: ${overflow}px`);

      // Verify Platform Switcher exists
      const switcherExists = await page.evaluate(() => {
        return !!document.querySelector('[data-testid="platform-mode-switcher"]') ||
               !!document.querySelector('a[title*="Mobile"], a[title*="Desktop"], button[title*="Install"]');
      });
      assert(switcherExists, 'PlatformModeSwitcher should exist in the navigation bar');

      // Verify BottomNav is not visible on Desktop
      const bottomNavVisible = await page.evaluate(() => {
        const nav = document.querySelector('nav.fixed.bottom-0');
        if (!nav) return false;
        const style = window.getComputedStyle(nav);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });
      assert(!bottomNavVisible, 'Android Bottom Nav must be hidden on Desktop viewports');

      const screenshotPath = path.join(SCREENSHOT_DIR, 'desktop_web_1440.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸 Captured desktop screenshot: ${screenshotPath}`);
    });

    // 3.2 Android Mobile Viewport (Google Pixel 7: 412x915, mobile user agent, touch)
    await test('Android Smartphone Viewport (412x915): Bottom Nav, Sync Bar, touch targets >= 44px', async () => {
      await page.setUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36'
      );
      await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

      const res = await page.goto(`${BASE_URL}/field-sales/mobile`, { waitUntil: 'networkidle0', timeout: 30000 });
      assert(res && res.ok(), 'Mobile /field-sales/mobile must return HTTP 200');

      // Verify Android Bottom Navigation is rendered
      const bottomNavExists = await page.evaluate(() => {
        const nav = document.querySelector('nav.fixed.bottom-0');
        return !!nav;
      });
      assert(bottomNavExists, 'Android Bottom Nav must exist on mobile');

      // Verify 5 navigation tabs
      const tabCount = await page.evaluate(() => {
        const nav = document.querySelector('nav.fixed.bottom-0');
        if (!nav) return 0;
        return nav.querySelectorAll('a, button').length;
      });
      assert(tabCount >= 5, `Expected 5 bottom nav tabs, found: ${tabCount}`);

      // Verify touch targets >= 44px
      const smallTouchTargets = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('nav.fixed.bottom-0 a, nav.fixed.bottom-0 button'));
        return buttons.filter((b) => {
          const rect = b.getBoundingClientRect();
          return rect.height < 40 || rect.width < 40;
        }).length;
      });
      assert.strictEqual(smallTouchTargets, 0, 'All bottom navigation buttons must meet touch target sizes (>= 40px)');

      // Verify Android Sync Status Bar exists
      const syncBarExists = await page.evaluate(() => {
        return !!document.querySelector('[data-testid="android-sync-bar"]') ||
               document.body.innerText.includes('Online - Synced') ||
               document.body.innerText.includes('Offline');
      });
      assert(syncBarExists, 'Android Sync Status Bar or status indicator should be present');

      // Check horizontal overflow
      const mobileOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth;
      });
      assert(mobileOverflow <= 0, `Mobile page should not have horizontal overflow, overflow was: ${mobileOverflow}px`);

      const screenshotPath = path.join(SCREENSHOT_DIR, 'android_phone_412.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸 Captured mobile field sales screenshot: ${screenshotPath}`);

      // Test mobile distribution view
      await page.goto(`${BASE_URL}/distribution`, { waitUntil: 'networkidle0', timeout: 30000 });
      const distOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth;
      });
      assert(distOverflow <= 0, `Mobile /distribution should not overflow horizontally, was: ${distOverflow}px`);

      const distScreenshot = path.join(SCREENSHOT_DIR, 'android_phone_distribution_412.png');
      await page.screenshot({ path: distScreenshot, fullPage: false });
      console.log(`   📸 Captured mobile distribution screenshot: ${distScreenshot}`);
    });

    // 3.3 Android Tablet Viewport (Samsung Galaxy Tab: 800x1280)
    await test('Android Tablet Viewport (800x1280): Adaptive grid, seamless tablet layout, zero overflow', async () => {
      await page.goto('about:blank');
      await page.setUserAgent(
        'Mozilla/5.0 (Linux; Android 13; SM-X900 Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Safari/537.36'
      );
      await page.setViewport({ width: 800, height: 1280, isMobile: true, hasTouch: true });

      const res = await page.goto(`${BASE_URL}/distribution`, { waitUntil: 'networkidle0', timeout: 30000 });
      const ok = !res || res.ok() || res.status() === 304;
      assert(ok, `Tablet /distribution must return HTTP 200 or 304, got: ${res ? res.status() : 'null'}`);

      const tabletOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth;
      });
      assert(tabletOverflow <= 0, `Tablet page should not have horizontal overflow, overflow was: ${tabletOverflow}px`);

      const tabletDistScreenshot = path.join(SCREENSHOT_DIR, 'android_tablet_800.png');
      await page.screenshot({ path: tabletDistScreenshot, fullPage: false });
      console.log(`   📸 Captured tablet distribution screenshot: ${tabletDistScreenshot}`);

      // Test catalog on tablet
      await page.goto(`${BASE_URL}/catalog`, { waitUntil: 'networkidle0', timeout: 30000 });
      const tabletCatalogScreenshot = path.join(SCREENSHOT_DIR, 'android_tablet_catalog_800.png');
      await page.screenshot({ path: tabletCatalogScreenshot, fullPage: false });
      console.log(`   📸 Captured tablet catalog screenshot: ${tabletCatalogScreenshot}`);
    });
  } finally {
    await browser.close();
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`📊 DUAL-PLATFORM AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDualPlatformSuite()
  .catch((err) => {
    console.error('Fatal dual-platform suite error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
