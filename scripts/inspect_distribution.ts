import puppeteer from 'puppeteer-core';
import { prisma } from '../src/lib/prisma';
import { generateTokens } from '../src/lib/auth';
import fs from 'fs';
import path from 'path';

async function inspectDistribution() {
  console.log('🔍 APEX ELECTRONICS: Starting Browser Inspection of /distribution...');

  // 1. Get admin token
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@acme.com' },
    include: { employee: true },
  });
  if (!adminUser) throw new Error('Admin user not found');

  const { accessToken } = generateTokens({
    userId: adminUser.id,
    organizationId: adminUser.organizationId,
    email: adminUser.email,
    role: adminUser.role,
    employeeId: adminUser.employee?.id,
  });

  const screenshotsDir = path.join(process.cwd(), 'scripts', 'audit_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const consoleLogs: { type: string; text: string }[] = [];
  const networkErrors: { url: string; status: number; statusText: string }[] = [];
  const apiResponses: { url: string; status: number; ok: boolean }[] = [];

  const page = await browser.newPage();

  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      console.error(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/')) {
      apiResponses.push({ url, status: res.status(), ok: res.ok() });
      if (!res.ok()) {
        networkErrors.push({ url, status: res.status(), statusText: res.statusText() });
      }
    }
  });

  // Set auth cookie
  await page.setCookie({
    name: 'auth_token',
    value: accessToken,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
  });

  console.log('📱 Navigating to http://localhost:3000/distribution with Desktop Viewport (1440x900)...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/distribution', { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for dynamic data to populate
  await new Promise((r) => setTimeout(r, 2000));

  // Desktop Screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'distribution_desktop_1440.png') });
  console.log('📸 Desktop viewport screenshot saved');

  // Full-Page Screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'distribution_desktop_fullpage.png'), fullPage: true });
  console.log('📸 Full page desktop screenshot saved');

  // Inspect DOM metrics & Content
  const pageAudit = await page.evaluate(() => {
    const title = document.querySelector('h1')?.innerText;
    const kpiElements = Array.from(document.querySelectorAll('.grid-cols-1.sm\\:grid-cols-2 > div')).map((el) => {
      const heading = el.querySelector('span.text-xs')?.textContent?.trim();
      const value = el.querySelector('.text-2xl')?.textContent?.trim();
      return { heading, value };
    });

    const tablesCount = document.querySelectorAll('table').length;
    const tableRows = Array.from(document.querySelectorAll('tbody tr')).map((tr) => {
      return Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim());
    });

    const links = Array.from(document.querySelectorAll('a')).map((a) => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href'),
    }));

    // Check overflow
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const hasHorizontalScroll = scrollWidth > docWidth || bodyScrollWidth > docWidth;

    return {
      title,
      kpis: kpiElements,
      tablesCount,
      tableRowsCount: tableRows.length,
      sampleRows: tableRows.slice(0, 5),
      linksCount: links.length,
      hasHorizontalScroll,
      docWidth,
      scrollWidth,
      bodyScrollWidth,
    };
  });

  console.log('📊 DOM Audit Result:', JSON.stringify(pageAudit, null, 2));

  // Breakpoints inspection
  const breakpoints = [
    { name: 'mobile_320', width: 320, height: 568 },
    { name: 'mobile_360', width: 360, height: 640 },
    { name: 'mobile_390', width: 390, height: 844 },
    { name: 'mobile_430', width: 430, height: 932 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'laptop_1024', width: 1024, height: 768 },
    { name: 'desktop_1280', width: 1280, height: 800 },
    { name: 'ultrawide_1920', width: 1920, height: 1080 },
  ];

  const breakpointResults = [];

  for (const bp of breakpoints) {
    await page.setViewport({ width: bp.width, height: bp.height });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event('resize'));
    });
    await new Promise((r) => setTimeout(r, 600));
    const ssPath = path.join(screenshotsDir, `distribution_${bp.name}.png`);
    await page.screenshot({ path: ssPath });

    const overflowCheck = await page.evaluate(() => {
      const innerW = window.innerWidth;
      const docW = document.documentElement.clientWidth;
      const docScroll = document.documentElement.scrollWidth;
      const bodyScroll = document.body.scrollWidth;
      const hasHorizontalScroll = docScroll > innerW || bodyScroll > innerW;
      return {
        innerWidth: innerW,
        clientWidth: docW,
        scrollWidth: docScroll,
        bodyScrollWidth: bodyScroll,
        overflow: hasHorizontalScroll,
      };
    });

    breakpointResults.push({
      breakpoint: bp.name,
      viewport: `${bp.width}x${bp.height}`,
      overflowCheck,
    });
    console.log(`📸 Captured ${bp.name} (${bp.width}x${bp.height}) - Horizontal Overflow: ${overflowCheck.overflow ? '⚠️ YES' : '✅ NO'}`);
  }

  await browser.close();

  // Write audit summary
  const auditSummary = {
    timestamp: new Date().toISOString(),
    apiResponses,
    networkErrors,
    consoleLogs: consoleLogs.filter((l) => l.type === 'error' || l.type === 'warn'),
    pageAudit,
    breakpointResults,
  };

  fs.writeFileSync(
    path.join(screenshotsDir, 'audit_summary.json'),
    JSON.stringify(auditSummary, null, 2)
  );

  console.log('✅ Inspection Completed successfully!');
  console.log(`Network Errors: ${networkErrors.length}`);
  console.log(`Console Errors/Warnings: ${consoleLogs.filter((l) => l.type === 'error' || l.type === 'warn').length}`);
}

inspectDistribution().catch((err) => {
  console.error('Fatal Inspection Error:', err);
  process.exit(1);
});
