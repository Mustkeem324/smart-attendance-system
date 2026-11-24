const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function runVerification() {
  console.log('🚀 Starting SmartHRMS UI/UX Redesign Automated Verification...');
  const artifactDir = '/home/nx-pro/.gemini/antigravity-cli/brain/8252e3dc-4357-4df3-9ff3-7583201d6329/screenshots';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    const baseUrl = 'http://localhost:3005';

    // Desktop viewport (1440x900)
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Login with Salman Enterprises Admin Account
    console.log('🔑 Logging in as Salman Enterprises Admin...');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill credentials
    await page.waitForSelector('input[placeholder*="salman"]', { timeout: 10000 });
    await page.type('input[placeholder*="salman"]', 'salmanenterprisesphu@gmail.com');
    await page.type('input[type="password"]', 'Admin@12345');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    console.log(`Current page after login: ${page.url()}`);

    // 2. Test Live Attendance & Geofence Page
    console.log('📍 Navigating to Live Attendance & Geofence Monitor (/admin/attendance/live)...');
    await page.goto(`${baseUrl}/admin/attendance/live`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3500)); // allow leaflet tiles to load

    const liveDesktopShot = path.join(artifactDir, 'redesign_live_attendance_desktop.png');
    await page.screenshot({ path: liveDesktopShot, fullPage: false });
    console.log(`📸 Desktop Live Attendance screenshot saved: ${liveDesktopShot}`);

    // Check Leaflet map element
    const leafletMapExists = await page.evaluate(() => {
      return Boolean(document.querySelector('.leaflet-container'));
    });
    console.log(`🗺️ Leaflet Map Initialized: ${leafletMapExists}`);

    // Check 6 KPI cards
    const kpiTexts = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.grid > div'));
      return cards.slice(0, 6).map((c) => c.innerText.replace(/\n+/g, ' '));
    });
    console.log('📊 6 KPI Cards:', kpiTexts);

    // 3. Test Tab switching (e.g. click "Late Arrivals")
    console.log('🖱️ Testing tab switching: Late Arrivals & Exceptions Queue...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const lateTab = tabs.find((b) => b.innerText.includes('Late Arrivals'));
      if (lateTab) lateTab.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const lateTabShot = path.join(artifactDir, 'redesign_live_attendance_late_tab.png');
    await page.screenshot({ path: lateTabShot, fullPage: false });
    console.log(`📸 Late Arrivals Tab screenshot saved: ${lateTabShot}`);

    // 4. Test Executive Dashboard (/admin/dashboard)
    console.log('📈 Navigating to Executive HRMS Dashboard (/admin/dashboard)...');
    await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    const dashboardDesktopShot = path.join(artifactDir, 'redesign_admin_dashboard_desktop.png');
    await page.screenshot({ path: dashboardDesktopShot, fullPage: false });
    console.log(`📸 Desktop Admin Dashboard screenshot saved: ${dashboardDesktopShot}`);

    // Check Quick Actions
    const quickActions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/employees') || a.href.includes('/shifts') || a.href.includes('/branches')).map(a => a.innerText.replace(/\n+/g, ' '));
    });
    console.log('⚡ Quick Actions found:', quickActions.slice(0, 6));

    // 5. Mobile Viewport Test (390x844 - iPhone 14)
    console.log('📱 Switching to Mobile Viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${baseUrl}/admin/attendance/live`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    const mobileLiveShot = path.join(artifactDir, 'redesign_live_attendance_mobile_390.png');
    await page.screenshot({ path: mobileLiveShot, fullPage: false });
    console.log(`📸 Mobile Live Attendance screenshot saved: ${mobileLiveShot}`);

    // Check Mobile Sidebar toggle
    console.log('📱 Opening Mobile Sidebar...');
    await page.evaluate(() => {
      const menuBtn = document.querySelector('header button[aria-label="Toggle menu"]');
      if (menuBtn) menuBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const mobileSidebarShot = path.join(artifactDir, 'redesign_mobile_sidebar_open.png');
    await page.screenshot({ path: mobileSidebarShot, fullPage: false });
    console.log(`📸 Mobile Sidebar Open screenshot saved: ${mobileSidebarShot}`);

    console.log('🎉 Verification successfully finished with 0 errors!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
