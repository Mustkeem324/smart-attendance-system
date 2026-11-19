import assert from 'node:assert';
import { connectToDatabase } from '../src/lib/mongodb';
import {
  ShopVisit,
  Retailer,
  Product,
  PriceOverride,
  ShopApplication,
} from '../src/models/electronics-sales';
import { prisma } from '../src/lib/prisma';
import { generateTokens } from '../src/lib/auth';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runAdvancedFieldSalesSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING APEX ELECTRONICS ADVANCED FIELD SALES TEST SUITE');
  console.log('================================================================');

  await connectToDatabase();

  // 1. Get authenticated user token for test requests
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

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  let activeShopId: string | null = null;
  let activeVisitId: string | null = null;
  let registeredShopCode: string | null = null;
  let overrideIdToReview: string | null = null;
  let appIdToReview: string | null = null;

  // TEST 1: Field Sales Dashboard
  await test('TEST 1: Employee opens Field Sales Dashboard & receives telemetry', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/field-sales/dashboard`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.employee !== undefined);
    assert(data.data.kpis !== undefined);
    assert(Array.isArray(data.data.visitPlan));
    assert(Array.isArray(data.data.dailyTrend));
  });

  // TEST 2: Search existing shops
  await test('TEST 2: Employee searches for an existing shop by name / code', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/field-sales/shops/search?q=Sangeetha`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.length > 0);
    activeShopId = data.data[0]._id;
  });

  // TEST 3: Register a new shop with duplicate detection
  await test('TEST 3: Employee registers new shop with duplicate prevention check', async () => {
    const uniquePhone = `98${Date.now().toString().slice(-8)}`;
    const res = await fetch(`${BASE_URL}/api/v1/field-sales/shops/register`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Apex Test Dealer Arcade',
        ownerName: 'Ramesh Shenoy',
        phone: uniquePhone,
        address: '#19 Commercial Street, Tasker Town',
        locality: 'Commercial Street',
        city: 'Bangalore',
        pincode: '560001',
        latitude: 12.9818,
        longitude: 77.6083,
        shopCategory: 'MOBILE_RETAIL',
        gstin: '29AABCS9988D1Z2',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.registrationReference.startsWith('REG-SHOP-'));
    registeredShopCode = data.data.shop.dealerCode;
    appIdToReview = data.data.application.applicationId;

    // Test duplicate detection by trying to register with the same phone
    const dupRes = await fetch(`${BASE_URL}/api/v1/field-sales/shops/register`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Apex Another Name',
        ownerName: 'Someone Else',
        phone: uniquePhone, // Same phone
        address: 'Different address',
        city: 'Bangalore',
        pincode: '560001',
        latitude: 12.9818,
        longitude: 77.6083,
      }),
    });
    assert.strictEqual(dupRes.status, 409, 'Must prevent exact phone duplicate');
  });

  // TEST 4: Start visit session
  await test('TEST 4: Employee starts visit session and generates unique Visit ID', async () => {
    assert(activeShopId);
    const res = await fetch(`${BASE_URL}/api/v1/field-sales/visits/start`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        retailerId: activeShopId,
        visitType: 'existing_shop',
      }),
    });

    assert(res.status === 200 || res.status === 201, `Expected 200 or 201, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.visitId || data.data._id);
    activeVisitId = data.data.visitId || data.data._id;
  });

  // TEST 5: Capture GPS location & Google Maps URL
  await test('TEST 5: Employee captures GPS coordinates & Google Maps link is generated', async () => {
    assert(activeVisitId);
    const res = await fetch(`${BASE_URL}/api/v1/field-sales/visits/${activeVisitId}/location`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        latitude: 12.978369,
        longitude: 77.640831,
        accuracyMeters: 14,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.googleMapsUrl.startsWith('https://www.google.com/maps?q='));
    assert(data.data.distanceFromShopMeters !== undefined);
  });

  // TEST 6: Capture 2 Photographs (Shop Front & Shopkeeper Interaction)
  await test('TEST 6: Employee captures 2 photographs with metadata & consent', async () => {
    assert(activeVisitId);
    const res = await fetch(`${BASE_URL}/api/v1/field-sales/visits/${activeVisitId}/photos`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        shopFrontPhoto: {
          photoUrl: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80',
          captureMethod: 'LIVE_CAMERA',
        },
        shopInteractionPhoto: {
          photoUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=600&q=80',
          captureMethod: 'LIVE_CAMERA',
          interactionConsentGiven: true,
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.hasBothPhotos, true);
  });

  // TEST 7: Query catalog products
  let testProducts: any[] = [];
  await test('TEST 7: System loads real catalog products with standard prices', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/field-sales/products?limit=5`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.length >= 2);
    testProducts = data.data;
    assert(testProducts[0].standardSellingPrice > 0);
  });

  // TEST 8: Enter product sales with standard and manual pricing
  await test('TEST 8: Employee records product sales with standard & manual pricing override', async () => {
    assert(activeVisitId && testProducts.length >= 2);
    const p1 = testProducts[0];
    const p2 = testProducts[1];

    // p2 has manual discounted price (> 7% concession so it flags for manager review)
    const discountedPrice = Math.round(p2.standardSellingPrice * 0.90);

    const saleTime = new Date().toISOString();

    const res = await fetch(`${BASE_URL}/api/v1/field-sales/visits/${activeVisitId}/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        saleDateTime: saleTime,
        distributorDetails: {
          name: 'Apex South Central DC',
          phone: '9845011999',
          email: 'dispatch@apexdc.com',
        },
        salesLines: [
          {
            productId: p1._id,
            quantity: 4,
            priceType: 'STANDARD',
            actualSellingPrice: p1.standardSellingPrice,
          },
          {
            productId: p2._id,
            quantity: 3,
            priceType: 'MANUAL',
            actualSellingPrice: discountedPrice,
            manualPriceReason: 'Approved promotional volume concession',
          },
        ],
        visitRemarks: 'Strong customer footfall in Indiranagar showroom',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.totalUnits, 7);
    assert(data.data.actualSalesValue > 0);
    assert.strictEqual(data.data.pendingPriceOverridesCount, 1);
  });

  // TEST 9: Final visit submission & confirmation
  await test('TEST 9: Employee confirms and submits visit report permanently into MongoDB', async () => {
    assert(activeVisitId);
    const res = await fetch(`${BASE_URL}/api/v1/field-sales/visits/${activeVisitId}/submit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        confirmedAccurate: true,
        remarks: 'Confirmed stock receipt and physical signage verification',
        idempotencyKey: `idemp-submit-${activeVisitId}`,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.visitStatus, 'SUBMITTED');
    assert(data.data.totalProducts >= 2);

    // Verify in MongoDB
    const dbVisit = await ShopVisit.findOne({
      $or: [{ visitId: activeVisitId }, { _id: activeVisitId.match(/^[0-9a-fA-F]{24}$/) ? activeVisitId : null }],
    });
    assert(dbVisit, 'Visit must exist in MongoDB');
    assert.strictEqual(dbVisit.status, 'COMPLETED');
    assert(dbVisit.googleMapsUrl);
    assert(dbVisit.shopFrontPhoto?.photoUrl);

    // Find created PriceOverride
    const override = await PriceOverride.findOne({ visitId: dbVisit.visitId });
    if (override) {
      overrideIdToReview = override.overrideId;
    }
  });

  // TEST 10: Admin analytics & reporting
  await test('TEST 10: Administrator queries analytics, brand sales & interactive map markers', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/field-sales/analytics`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.kpis.totalFieldEmployees > 0);
    assert(data.data.mapMarkers.length > 0);
    assert(data.data.analytics.brandSales.length > 0);
  });

  // TEST 11: Admin approves manual price override
  if (overrideIdToReview) {
    await test('TEST 11: Administrator 1-click approves manual price override request', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/field-sales/price-overrides/${overrideIdToReview}/approve`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ remarks: 'Approved for Q3 regional dealer tier incentive' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.approvalStatus, 'APPROVED');
    });
  }

  // TEST 12: Admin approves new shop onboarding application
  if (appIdToReview) {
    await test('TEST 12: Administrator 1-click approves new shop onboarding application', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/field-sales/shop-applications/${appIdToReview}/approve`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ remarks: 'Trade license and physical geofence confirmed' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.verificationStatus, 'APPROVED');
    });
  }

  // TEST 13: UI page rendering tests (HTTP 200)
  await test('TEST 13: Mobile Field Sales app renders (GET /field-sales/mobile)', async () => {
    const res = await fetch(`${BASE_URL}/field-sales/mobile`);
    assert.strictEqual(res.status, 200);
  });

  await test('TEST 14: Admin Field Sales Dashboard renders (GET /field-sales)', async () => {
    const res = await fetch(`${BASE_URL}/field-sales`);
    assert.strictEqual(res.status, 200);
  });

  // Teardown test shop & application so test artifacts are cleanly pruned
  try {
    if (registeredShopCode) {
      await Retailer.deleteOne({ dealerCode: registeredShopCode });
    }
    if (appIdToReview) {
      await ShopApplication.deleteOne({ applicationId: appIdToReview });
    }
  } catch (cleanErr) {
    console.warn('Non-fatal cleanup warning:', cleanErr);
  }

  console.log('================================================================');
  console.log(`📊 ADVANCED FIELD SALES SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runAdvancedFieldSalesSuite().catch((err) => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
