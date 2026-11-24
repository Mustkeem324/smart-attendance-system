const puppeteer = require('puppeteer-core');

async function testNotif() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Login as admin
  await page.goto('http://localhost:3005/login', { waitUntil: 'networkidle2' });
  await page.type('input[placeholder*="salman"]', 'salmanenterprisesphu@gmail.com');
  await page.type('input[type="password"]', 'Admin@12345');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  console.log('Current URL:', page.url());

  // Click notification bell in DistributionHeader
  const buttons = await page.$$('button');
  console.log('Total buttons on distribution:', buttons.length);
  for (const b of buttons) {
    const html = await page.evaluate(el => el.innerHTML, b);
    if (html.includes('lucide-bell') || html.includes('Bell')) {
      console.log('Found bell button, clicking...');
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: '/home/nx-pro/.gemini/antigravity-cli/brain/8252e3dc-4357-4df3-9ff3-7583201d6329/screenshots/test_distribution_notif_click.png' });
  console.log('Saved test_distribution_notif_click.png');

  // Now go to /admin/notifications
  await page.goto('http://localhost:3005/admin/notifications', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: '/home/nx-pro/.gemini/antigravity-cli/brain/8252e3dc-4357-4df3-9ff3-7583201d6329/screenshots/test_admin_notifications_page.png' });
  console.log('Saved test_admin_notifications_page.png');

  // Now go to /distribution/notifications
  await page.goto('http://localhost:3005/distribution/notifications', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: '/home/nx-pro/.gemini/antigravity-cli/brain/8252e3dc-4357-4df3-9ff3-7583201d6329/screenshots/test_distribution_notifications_page.png' });
  console.log('Saved test_distribution_notifications_page.png');

  // In /admin/dashboard, click notification bell in Navbar
  await page.goto('http://localhost:3005/admin/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const adminButtons = await page.$$('button');
  for (const b of adminButtons) {
    const html = await page.evaluate(el => el.innerHTML, b);
    if (html.includes('lucide-bell') || html.includes('aria-label="Notifications"')) {
      console.log('Found admin bell button, clicking...');
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: '/home/nx-pro/.gemini/antigravity-cli/brain/8252e3dc-4357-4df3-9ff3-7583201d6329/screenshots/test_admin_notif_click.png' });
  console.log('Saved test_admin_notif_click.png');

  await browser.close();
}
testNotif().catch(console.error);
