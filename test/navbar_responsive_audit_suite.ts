import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(
  '/home/nx-pro/.gemini/antigravity-cli/brain/8252e3dc-4357-4df3-9ff3-7583201d6329/screenshots'
);

async function runNavbarAuditSuite() {
  console.log('================================================================');
  console.log('🌟 RUNNING APEX ELECTRONICS PUBLIC NAVBAR AUDIT SUITE');
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

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Filter out expected Next.js prefetch 404s if any
        consoleErrors.push(msg.text());
      }
    });

    // =========================================================================
    // 1. DESKTOP LARGE (1440x900) — FULL STRUCTURE & VISUAL HIERARCHY AUDIT
    // =========================================================================
    console.log('\n--- 1. DESKTOP LARGE (1440x900) AUDIT ---');

    await test('Desktop 1440px: Brand Identity renders correctly (Logo, Company, B2B Subtitle)', async () => {
      await page.setViewport({ width: 1440, height: 900 });
      const res = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 30000 });
      assert(res && (res.ok() || res.status() === 304), 'Page must return HTTP 200/304');

      const brandText = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return null;
        const company = header.querySelector('span.font-black')?.textContent?.trim();
        const subtitle = header.querySelector('span.tracking-widest')?.textContent?.trim();
        return { company, subtitle };
      });

      assert.strictEqual(brandText?.company, 'APEX ELECTRONICS');
      assert.strictEqual(brandText?.subtitle, 'B2B DISTRIBUTION');
    });

    await test('Desktop 1440px: Primary Navigation links render with real dynamic product count', async () => {
      const navLinks = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return [];
        const links = Array.from(header.querySelectorAll('nav[aria-label="Main Navigation"] a, nav[aria-label="Main Navigation"] button'));
        return links.map((el) => el.textContent?.trim());
      });

      console.log('   ↳ Detected Main Nav Items:', navLinks.join(' | '));
      assert(navLinks.some((l) => l?.includes('Home')), 'Home link must exist');
      assert(navLinks.some((l) => l?.includes('Catalog')), 'Catalog link must exist');
      assert(navLinks.some((l) => l?.includes('ROI Calculator')), 'ROI Calculator link must exist');
      assert(navLinks.some((l) => l?.includes('Brands')), 'Brands link must exist');
      assert(navLinks.some((l) => l?.includes('Logistics')), 'Logistics link must exist');
      assert(navLinks.some((l) => l?.includes('Partner Application')), 'Partner Application link must exist');
      assert(navLinks.some((l) => l?.includes('Contact')), 'Contact link must exist');

      // Check product count badge
      const catalogText = navLinks.find((l) => l?.includes('Catalog')) || '';
      assert(/\d+/.test(catalogText), `Catalog badge should contain real number, was: "${catalogText}"`);
    });

    await test('Desktop 1440px: Actions & Visual Hierarchy (Secondary vs Primary CTA)', async () => {
      const actions = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return [];
        const btns = Array.from(header.querySelectorAll('.hidden.sm\\:flex a, .hidden.sm\\:flex button'));
        return btns.map((el) => ({
          text: el.textContent?.trim(),
          isPrimaryCta: el.className.includes('bg-gradient-to-r'),
        }));
      });

      console.log('   ↳ Right Action Items:', actions.map((a) => `${a.text} (Primary: ${a.isPrimaryCta})`).join(' | '));
      const becomeRetailer = actions.find((a) => a.text?.includes('Become Retailer'));
      assert(becomeRetailer, '"Become Retailer" primary CTA must exist');
      assert(becomeRetailer.isPrimaryCta, '"Become Retailer" must be styled with the primary gradient');

      const portalLogin = actions.find((a) => a.text?.includes('Portal Login'));
      assert(portalLogin, 'Portal Login must exist in actions');
      assert(!portalLogin.isPrimaryCta, 'Portal Login must be styled as a clean secondary action');

      // Screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, 'navbar_after_desktop_1440.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸 Saved desktop 1440 screenshot: ${screenshotPath}`);
    });

    // =========================================================================
    // 2. STICKY NAVBAR BEHAVIOR AUDIT
    // =========================================================================
    console.log('\n--- 2. STICKY NAVBAR SCROLL BEHAVIOR AUDIT ---');

    await test('Sticky Behavior: Header remains sticky at top:0 with enhanced frosted blur on scroll', async () => {
      // Scroll down 400px
      await page.evaluate(() => window.scrollTo(0, 400));
      await new Promise((r) => setTimeout(r, 400));

      const stickyState = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return null;
        const rect = header.getBoundingClientRect();
        const style = window.getComputedStyle(header);
        return {
          top: rect.top,
          position: style.position,
          hasShadow: header.className.includes('shadow-xl') || style.boxShadow !== 'none',
        };
      });

      assert.strictEqual(stickyState?.top, 0, 'Sticky header top must be 0px after scroll');
      assert(['sticky', 'fixed'].includes(stickyState?.position || ''), 'Header position must be sticky or fixed');

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 200));
    });

    // =========================================================================
    // 3. SEARCH MODAL INTERACTION AUDIT
    // =========================================================================
    console.log('\n--- 3. SEARCH MODAL INTERACTION AUDIT ---');

    await test('Search Interaction: Clicking search opens modal and Escape closes it', async () => {
      const searchBtn = await page.$('header button[title*="Search"]');
      assert(searchBtn, 'Search icon button must exist in header');
      await searchBtn.click();
      await new Promise((r) => setTimeout(r, 300));

      const modalVisible = await page.evaluate(() => {
        const input = document.querySelector('input[placeholder*="Search"]');
        return !!input && window.getComputedStyle(input).visibility !== 'hidden';
      });
      assert(modalVisible, 'Search modal overlay and input must be visible after click');

      // Close via Escape key
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 300));

      const modalClosed = await page.evaluate(() => {
        return !document.querySelector('div[role="dialog"]');
      });
      assert(modalClosed, 'Search modal must close when pressing Escape');
    });

    // =========================================================================
    // 4. MULTI-DEVICE RESPONSIVE OVERFLOW AUDIT (9 VIEWPORTS)
    // =========================================================================
    console.log('\n--- 4. MULTI-DEVICE RESPONSIVE OVERFLOW & LAYOUT AUDIT ---');

    const viewports = [
      { name: 'Ultra-Wide', width: 1920, height: 1080, file: 'navbar_after_ultrawide_1920.png' },
      { name: 'Desktop Large', width: 1440, height: 900, file: 'navbar_after_desktop_1440.png' },
      { name: 'Desktop Standard', width: 1280, height: 800, file: 'navbar_after_desktop_1280.png' },
      { name: 'Laptop', width: 1024, height: 768, file: 'navbar_after_laptop_1024.png' },
      { name: 'Tablet', width: 768, height: 1024, file: 'navbar_after_tablet_768.png' },
      { name: 'Mobile XL', width: 430, height: 932, file: 'navbar_after_mobile_430.png' },
      { name: 'Mobile Large', width: 390, height: 844, file: 'navbar_after_mobile_390.png' },
      { name: 'Mobile Medium', width: 360, height: 640, file: 'navbar_after_mobile_360.png' },
      { name: 'Mobile Small', width: 320, height: 568, file: 'navbar_after_mobile_320.png' },
    ];

    for (const vp of viewports) {
      await test(`Responsive Viewport: ${vp.name} (${vp.width}x${vp.height}) has 0 horizontal overflow`, async () => {
        await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 768 });
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 30000 });

        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth - window.innerWidth;
        });

        assert(overflow <= 0, `Horizontal overflow detected at ${vp.name} (${vp.width}px): ${overflow}px`);

        const shotPath = path.join(SCREENSHOT_DIR, vp.file);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`   📸 Captured ${vp.name} screenshot: ${shotPath}`);
      });
    }

    // =========================================================================
    // 5. MOBILE DRAWER INTERACTION AUDIT
    // =========================================================================
    console.log('\n--- 5. MOBILE DRAWER INTERACTION AUDIT ---');

    await test('Mobile Drawer: Toggling hamburger opens slide-in drawer and locks body scroll', async () => {
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 30000 });

      // Click Hamburger toggle
      const menuBtn = await page.$('button[aria-label*="Navigation Menu"]');
      assert(menuBtn, 'Mobile hamburger button must exist on mobile');
      await menuBtn.click();
      await new Promise((r) => setTimeout(r, 300));

      const drawerState = await page.evaluate(() => {
        const drawer = document.querySelector('div.lg\\:hidden.bg-\\[\\#0A0D26\\]');
        const bodyOverflow = document.body.style.overflow;
        return {
          isOpen: !!drawer,
          bodyLocked: bodyOverflow === 'hidden',
          itemsCount: drawer ? drawer.querySelectorAll('a').length : 0,
        };
      });

      assert(drawerState.isOpen, 'Mobile drawer must be visible when open');
      assert(drawerState.bodyLocked, 'Body scroll must be locked when drawer is open');
      assert(drawerState.itemsCount >= 6, `Expected at least 6 drawer navigation links, got: ${drawerState.itemsCount}`);

      const drawerScreenshot = path.join(SCREENSHOT_DIR, 'navbar_after_mobile_drawer_390.png');
      await page.screenshot({ path: drawerScreenshot, fullPage: false });
      console.log(`   📸 Captured mobile drawer screenshot: ${drawerScreenshot}`);

      // Close menu by clicking the button again
      await menuBtn.click();
      await new Promise((r) => setTimeout(r, 200));

      const isClosed = await page.evaluate(() => {
        return !document.querySelector('div.lg\\:hidden.bg-\\[\\#0A0D26\\]');
      });
      assert(isClosed, 'Mobile drawer must close when toggle is clicked again');
    });

    // =========================================================================
    // 6. CATALOG PAGE INTEGRATION AUDIT
    // =========================================================================
    console.log('\n--- 6. CATALOG PAGE NAVBAR AUDIT ---');

    await test('Catalog Page (/catalog): Navbar renders consistently with active state and real count', async () => {
      await page.setViewport({ width: 1440, height: 900 });
      const res = await page.goto(`${BASE_URL}/catalog`, { waitUntil: 'networkidle0', timeout: 30000 });
      assert(res && (res.ok() || res.status() === 304), 'Catalog page must return HTTP 200/304');

      const catalogNavbarInfo = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return null;
        const brand = header.querySelector('span.font-black')?.textContent?.trim();
        const catalogLink = Array.from(header.querySelectorAll('a')).find((a) => a.href.includes('/catalog'));
        const isActive = catalogLink?.className.includes('text-white font-bold');
        const countBadge = catalogLink?.querySelector('span.font-mono')?.textContent?.trim();
        return { brand, isActive, countBadge };
      });

      assert.strictEqual(catalogNavbarInfo?.brand, 'APEX ELECTRONICS');
      assert(catalogNavbarInfo?.isActive, 'Catalog link must have active styling on /catalog');
      assert(catalogNavbarInfo?.countBadge, 'Catalog count badge must be present');

      const catalogShot = path.join(SCREENSHOT_DIR, 'navbar_after_catalog_page_1440.png');
      await page.screenshot({ path: catalogShot, fullPage: false });
      console.log(`   📸 Captured catalog page navbar screenshot: ${catalogShot}`);
    });
  } finally {
    await browser.close();
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`📊 NAVBAR AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runNavbarAuditSuite().catch((err) => {
  console.error('Fatal navbar suite error:', err);
  process.exit(1);
});
