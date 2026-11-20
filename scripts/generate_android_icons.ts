import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

async function generateIcons() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // APEX Electronics Premium Vector Icon
  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0E122A" />
      <stop offset="50%" stop-color="#151A38" />
      <stop offset="100%" stop-color="#080A1B" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="50%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  <rect x="16" y="16" width="480" height="480" rx="112" fill="none" stroke="rgba(139, 92, 246, 0.25)" stroke-width="4" />

  <!-- Geometric Hex / Shield Outer Structure -->
  <path d="M256 72 L412 162 L412 350 L256 440 L100 350 L100 162 Z" 
        fill="none" stroke="url(#primaryGrad)" stroke-width="12" stroke-linejoin="round" opacity="0.4" />

  <!-- Inner Glowing Shield -->
  <path d="M256 100 L388 178 L388 334 L256 412 L124 334 L124 178 Z" 
        fill="url(#primaryGrad)" filter="url(#glow)" opacity="0.2" />

  <!-- Bold APEX 'A' Monogram & Circuit Nodes -->
  <path d="M256 130 L360 360 L300 360 L280 300 L232 300 L212 360 L152 360 Z" fill="url(#primaryGrad)" />
  <polygon points="256,190 272,254 240,254" fill="#0E122A" />

  <!-- Lightning / Digital Pulse Accent -->
  <path d="M256 220 L276 280 L246 280 L266 340" stroke="url(#accentGrad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" />

  <!-- Tech Nodes -->
  <circle cx="256" cy="72" r="14" fill="#8B5CF6" />
  <circle cx="412" cy="162" r="14" fill="#6366F1" />
  <circle cx="412" cy="350" r="14" fill="#38BDF8" />
  <circle cx="256" cy="440" r="14" fill="#8B5CF6" />
  <circle cx="100" cy="350" r="14" fill="#6366F1" />
  <circle cx="100" cy="162" r="14" fill="#38BDF8" />
</svg>
`;

  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent.trim());
  fs.writeFileSync(path.join(process.cwd(), 'public', 'icon.svg'), svgContent.trim());
  console.log('Saved SVG icon to public/icon.svg and public/icons/icon.svg');

  // Launch headless browser to render exact PNG icons
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;

    // 192x192
    await page.setViewport({ width: 192, height: 192, deviceScaleFactor: 1 });
    await page.goto(svgDataUri);
    await page.screenshot({ path: path.join(iconsDir, 'icon-192.png'), omitBackground: false });
    console.log('Generated public/icons/icon-192.png');

    // 512x512
    await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
    await page.goto(svgDataUri);
    await page.screenshot({ path: path.join(iconsDir, 'icon-512.png'), omitBackground: false });
    console.log('Generated public/icons/icon-512.png');

    // Copy to android mipmap directories
    const mipmapDirs = [
      'android/app/src/main/res/mipmap-hdpi',
      'android/app/src/main/res/mipmap-mdpi',
      'android/app/src/main/res/mipmap-xhdpi',
      'android/app/src/main/res/mipmap-xxhdpi',
      'android/app/src/main/res/mipmap-xxxhdpi',
    ];

    for (const d of mipmapDirs) {
      const fullDir = path.join(process.cwd(), d);
      if (fs.existsSync(fullDir)) {
        fs.copyFileSync(path.join(iconsDir, 'icon-192.png'), path.join(fullDir, 'ic_launcher.png'));
        fs.copyFileSync(path.join(iconsDir, 'icon-192.png'), path.join(fullDir, 'ic_launcher_round.png'));
      }
    }
    console.log('Synchronized launcher icons to Android mipmap resource directories');
  } finally {
    await browser.close();
  }
}

generateIcons().catch(console.error);
