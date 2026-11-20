# APEX Electronics — Automated Cross-Platform Testing Strategy

## 1. Testing Philosophy & Test Pyramid

To guarantee seamless quality across desktop web, mobile web, Android smartphones, and Android tablets, APEX employs an automated multi-tier testing strategy:

```
                  ┌────────────────────────┐
                  │ E2E Multi-Viewport     │
                  │ Puppeteer UI Suites    │
                  ├────────────────────────┤
                  │ Idempotent Sync        │
                  │ API Contract Tests     │
                  ├────────────────────────┤
                  │ MongoDB & Prisma Unit  │
                  │ Schema & Model Tests   │
                  └────────────────────────┘
```

1. **Unit & Schema Verification**: Prisma schema constraints, Mongoose schema validators, and JWT cryptographic verification.
2. **API & Offline Engine Tests**: End-to-end HTTP tests of `/api/v1/*` testing atomic sync, price calculations, and replay idempotency.
3. **Headless Browser Multi-Device E2E**: Real Chromium automation via Puppeteer testing viewports, touch emulation, responsive grids, zero horizontal overflow, and image loading.

---

## 2. Test Execution Command Center

All test suites are written in TypeScript and executed using `npx tsx`:

```bash
# 1. Dual-Platform Architecture & PWA / Android Verification Suite
npx tsx test/apex_web_android_dual_platform_suite.ts

# 2. Complete 9-Viewport Browser Distribution Responsive Suite
npx tsx test/apex_browser_distribution_suite.ts

# 3. Advanced Field Sales & Shop Visit Operations Suite
npx tsx test/apex_advanced_field_sales_suite.ts

# 4. Enterprise B2B Distribution Logistics Suite (Orders, IMEI, Ledgers)
npx tsx test/apex_enterprise_distribution_suite.ts

# 5. High-Resolution Employee Photos & Upload Suite
npx tsx test/verify_employee_photos.ts
```

---

## 3. Puppeteer Device & Viewport Emulation Matrix

In `test/apex_web_android_dual_platform_suite.ts`, Puppeteer configures three primary platform viewports:

| Viewport Profile | Width x Height | User Agent | Mobile Flag | Touch Support | Key Assertions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Desktop Web** | 1440 x 900 | Chrome Desktop (x86_64) | `false` | `false` | Top nav, sidebar, platform mode switcher, zero bottom nav, zero horizontal overflow. |
| **Android Smartphone** (Pixel 7) | 412 x 915 | Android 14 Chrome Webview (wv) | `true` | `true` | Fixed 5-tab bottom nav, sync status bar, touch target dimensions >= 40px, zero overflow. |
| **Android Tablet** (Galaxy Tab S8) | 800 x 1280 | Android 13 Chrome Mobile | `true` | `true` | Adaptive 2/3 column layout, responsive table cards, smooth scrolling, zero overflow. |

### Responsive Viewport Verification Suite (`apex_browser_distribution_suite.ts`)
Validates nine distinct device dimensions against layout degradation and horizontal scrollbars:
- Mobile Small: 320 x 568 (iPhone SE 1st gen)
- Mobile Medium: 360 x 640 (Galaxy A series)
- Mobile Large: 390 x 844 (iPhone 14)
- Mobile XL: 430 x 932 (iPhone 15 Pro Max)
- Tablet Portrait: 768 x 1024 (iPad Mini)
- Tablet Landscape: 1024 x 768 (iPad 10th gen)
- Desktop Standard: 1280 x 800 (13" MacBook / Chromebook)
- Desktop HD: 1440 x 900 (15" Laptop)
- Ultra-Wide: 1920 x 1080 (FHD Monitor)

---

## 4. How Horizontal Overflow Is Audited

Horizontal scrolling (`document.documentElement.scrollWidth > window.innerWidth`) creates broken mobile experiences. Every test step calculates:

```typescript
const overflow = await page.evaluate(() => {
  return document.documentElement.scrollWidth - window.innerWidth;
});
assert(overflow <= 0, `Page should not have horizontal overflow, was: ${overflow}px`);
```

If any element protrudes beyond the viewport bounds, the test fails with precise pixel differential metrics.

---

## 5. Touch Target & Accessibility Verification

On mobile viewports, touch targets smaller than 40px lead to mis-clicks and poor ergonomics:

```typescript
const smallTouchTargets = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('nav.fixed.bottom-0 a, nav.fixed.bottom-0 button'));
  return buttons.filter((b) => {
    const rect = b.getBoundingClientRect();
    return rect.height < 40 || rect.width < 40;
  }).length;
});
assert.strictEqual(smallTouchTargets, 0, 'All bottom navigation buttons must meet touch target sizes (>= 40px)');
```

---

## 6. Offline Idempotency Test Pattern

```typescript
const testIdempotencyKey = `SYNC-TEST-OP-${Date.now()}`;

// Attempt 1: Initial submission
const res1 = await fetch(`${BASE_URL}/api/v1/field-sales/visits/submit`, {
  headers: { 'x-idempotency-key': testIdempotencyKey, ...authHeader },
  body: JSON.stringify(payload)
});
assert.strictEqual(res1.status, 200);
const body1 = await res1.json();
assert.strictEqual(body1.data.isDuplicate, false);

// Attempt 2: Replay of the identical payload
const res2 = await fetch(`${BASE_URL}/api/v1/field-sales/visits/submit`, {
  headers: { 'x-idempotency-key': testIdempotencyKey, ...authHeader },
  body: JSON.stringify(payload)
});
assert.strictEqual(res2.status, 200);
const body2 = await res2.json();
assert.strictEqual(body2.data.isDuplicate, true);

// Verify MongoDB count remains strictly 1
const count = await ShopVisit.countDocuments({ idempotencyKey: testIdempotencyKey });
assert.strictEqual(count, 1);
```
