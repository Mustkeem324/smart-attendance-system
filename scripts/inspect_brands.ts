import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function inspectBrands() {
  console.log('🔍 Inspecting Leading Technology Brands UI on http://localhost:3000/#brands...');

  const screenshotsDir = '/home/nx-pro/.gemini/antigravity-cli/brain/8252e3dc-4357-4df3-9ff3-7583201d6329/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/#brands', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));

  // Scroll to #brands section
  await page.evaluate(() => {
    const el = document.getElementById('brands');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 800));

  // Capture Desktop Screenshot of Brands Section
  const brandsSection = await page.$('#brands');
  if (brandsSection) {
    await brandsSection.screenshot({ path: path.join(screenshotsDir, 'brands_section_desktop_1440.png') });
    console.log('📸 Desktop brands section screenshot saved');
  }

  // Audit DOM content and image loading
  const brandAudit = await page.evaluate(() => {
    const section = document.getElementById('brands');
    if (!section) return { error: 'Section #brands not found' };

    const title = section.querySelector('h2')?.textContent?.trim();
    const subtitle = section.querySelector('p')?.textContent?.trim();

    const cards = Array.from(section.querySelectorAll('.grid > div'));
    const brandData = cards.map((c) => {
      const name = c.querySelector('h3')?.textContent?.trim();
      const code = c.querySelector('.font-mono')?.textContent?.trim();
      const category = c.querySelector('.text-indigo-300')?.textContent?.trim();
      const flagship = c.querySelector('.font-mono.text-purple-300')?.textContent?.trim();
      const tier = c.querySelector('.tracking-wider.uppercase')?.textContent?.trim();

      const imgs = Array.from(c.querySelectorAll('img')).map((img) => ({
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt'),
        loaded: img.complete && img.naturalWidth > 0,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));

      return { name, code, category, flagship, tier, imgsCount: imgs.length, imgs };
    });

    return { title, subtitle, cardsCount: cards.length, brandData };
  });

  console.log('📊 Brands Section DOM Audit:', JSON.stringify(brandAudit, null, 2));

  // Test Filter Buttons
  console.log('Testing category filter buttons...');
  const filterResults = await page.evaluate(async () => {
    const section = document.getElementById('brands');
    const buttons = Array.from(section.querySelectorAll('.inline-flex.p-1 button'));
    const results: any[] = [];

    for (const btn of buttons) {
      const text = btn.textContent?.trim();
      (btn as HTMLElement).click();
      await new Promise((r) => setTimeout(r, 200));
      const visibleCards = Array.from(section.querySelectorAll('.grid > div')).map(
        (c) => c.querySelector('h3')?.textContent?.trim()
      );
      results.push({ tab: text, visibleCount: visibleCards.length, brands: visibleCards });
    }

    // Reset to ALL
    if (buttons[0]) (buttons[0] as HTMLElement).click();
    return results;
  });

  console.log('Filter Results:', JSON.stringify(filterResults, null, 2));

  // Capture Tablet Viewport
  await page.setViewport({ width: 768, height: 1024 });
  await page.evaluate(() => {
    const el = document.getElementById('brands');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 600));
  const tabletSection = await page.$('#brands');
  if (tabletSection) {
    await tabletSection.screenshot({ path: path.join(screenshotsDir, 'brands_section_tablet_768.png') });
    console.log('📸 Tablet brands section screenshot saved');
  }

  // Capture Mobile Viewport
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    const el = document.getElementById('brands');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 600));
  const mobileSection = await page.$('#brands');
  if (mobileSection) {
    await mobileSection.screenshot({ path: path.join(screenshotsDir, 'brands_section_mobile_390.png') });
    console.log('📸 Mobile brands section screenshot saved');
  }

  await browser.close();
  console.log('✅ Inspection Completed successfully!');
}

inspectBrands().catch((err) => {
  console.error('Fatal Inspection Error:', err);
  process.exit(1);
});
