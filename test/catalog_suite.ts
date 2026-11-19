import assert from 'assert';
import { connectToDatabase } from '../src/lib/mongodb';
import { Product, QuoteRequest } from '../src/models/electronics-sales';
import { generateTokens } from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runCatalogSuite() {
  console.log('================================================================');
  console.log('📱 RUNNING PREMIUM MOBILE & ELECTRONICS CATALOG TEST SUITE');
  console.log('================================================================');

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

  // 1. Categories and Brands Metadata API
  await test('GET /api/public/catalog/categories-brands returns categories & brands', async () => {
    const res = await fetch(`${BASE_URL}/api/public/catalog/categories-brands`);
    assert(res.ok, `Returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.totalProductsCount >= 20, `Expected at least 20 products, got ${data.totalProductsCount}`);
    assert(Array.isArray(data.categories), 'Expected categories array');
    assert(Array.isArray(data.brands), 'Expected brands array');
    assert(data.brands.length >= 5, `Expected at least 5 brands, got ${data.brands.length}`);
  });

  // 2. Public Catalog List & Protected Dealer Pricing
  let firstProductId = '';
  let firstProductSku = '';
  await test('GET /api/public/catalog returns paginated products with protected pricing', async () => {
    const res = await fetch(`${BASE_URL}/api/public/catalog?limit=12&page=1`);
    assert(res.ok, `Returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.products.length > 0, 'Products list should not be empty');
    assert.strictEqual(data.isDealerAuthorized, false, 'Public guest should not be dealer authorized');
    // Verify dealer price is protected (null) for public guest
    const sampleProduct = data.products[0];
    assert.strictEqual(sampleProduct.dealerPrice, null, 'Public guest must not see dealerPrice');
    assert(sampleProduct.mrp > 0, 'MRP should be present');
    firstProductId = sampleProduct._id;
    firstProductSku = sampleProduct.sku;
  });

  // 3. Brand Filter
  await test('GET /api/public/catalog?brand=Apple filters correctly', async () => {
    const res = await fetch(`${BASE_URL}/api/public/catalog?brand=Apple`);
    assert(res.ok, `Returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.products.length > 0, 'Apple products should exist');
    for (const p of data.products) {
      assert.strictEqual(p.brand.toLowerCase(), 'apple', `Product brand was ${p.brand}, expected Apple`);
    }
  });

  // 4. Category Filter
  await test('GET /api/public/catalog?category=SMARTPHONES filters correctly', async () => {
    const res = await fetch(`${BASE_URL}/api/public/catalog?category=SMARTPHONES`);
    assert(res.ok, `Returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.products.length > 0, 'Smartphone products should exist');
    for (const p of data.products) {
      assert.strictEqual(p.category, 'SMARTPHONES', `Product category was ${p.category}`);
    }
  });

  // 5. Smart Search Query
  await test('GET /api/public/catalog?q=S24 searches model and name', async () => {
    const res = await fetch(`${BASE_URL}/api/public/catalog?q=S24`);
    assert(res.ok, `Returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.products.length > 0, 'S24 query should return products');
    assert(data.products.some((p: any) => p.name.includes('S24')), 'Expected S24 in result name');
  });

  // 6. Product Detail Endpoint by ID and SKU
  await test('GET /api/public/catalog/[id] returns detailed specs and related products', async () => {
    assert(firstProductId, 'Need firstProductId from test 2');
    const res = await fetch(`${BASE_URL}/api/public/catalog/${firstProductId}`);
    assert(res.ok, `Returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.product._id, firstProductId);
    assert(Array.isArray(data.relatedProducts), 'Expected relatedProducts array');

    // Also test by SKU
    const resSku = await fetch(`${BASE_URL}/api/public/catalog/${firstProductSku}`);
    assert(resSku.ok, `SKU lookup returned ${resSku.status}`);
    const dataSku = await resSku.json();
    assert.strictEqual(dataSku.product.sku, firstProductSku);
  });

  // 7. Product Comparison Endpoint
  await test('GET /api/public/catalog/compare?ids=id1,id2 compares hardware specs', async () => {
    await connectToDatabase();
    const twoProducts = await Product.find().limit(2).lean();
    assert.strictEqual(twoProducts.length, 2, 'Need at least 2 products');
    const ids = twoProducts.map((p) => p._id.toString()).join(',');

    const res = await fetch(`${BASE_URL}/api/public/catalog/compare?ids=${ids}`);
    assert(res.ok, `Returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.count, 2);
    assert.strictEqual(data.products.length, 2);
    assert(data.products[0].processor, 'Expected processor in comparison');
    assert(data.products[0].hsnCode, 'Expected HSN in comparison');
  });

  // 8. B2B Wholesale Quote Request Submission
  let createdQuoteNumber = '';
  await test('POST /api/public/quote-request saves inquiry in MongoDB with QUO- number', async () => {
    const quotePayload = {
      businessName: 'Apex Prime Telecom ' + Date.now(),
      contactPerson: 'Suresh Raina',
      phone: '9845012345',
      email: `suresh.${Date.now()}@apexprime.in`,
      items: [
        {
          productName: 'Samsung Galaxy S24 Ultra 5G',
          brand: 'Samsung',
          modelName: 'Galaxy S24 Ultra',
          variant: '12GB 256GB Titanium Gray',
          quantity: 25,
          targetPrice: 112000,
        },
      ],
      preferredDeliveryLocation: 'Bangalore Central DC',
      city: 'Bangalore',
      state: 'Karnataka',
      additionalMessage: 'Required for commercial festive stocking with immediate delivery challan.',
    };

    const res = await fetch(`${BASE_URL}/api/public/quote-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotePayload),
    });
    assert(res.ok, `Returned status ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.quoteNumber.startsWith('QUO-'), `Expected quoteNumber starting with QUO-, got ${data.quoteNumber}`);
    createdQuoteNumber = data.quoteNumber;

    // Verify MongoDB persistence
    await connectToDatabase();
    const saved = await QuoteRequest.findOne({ quoteNumber: createdQuoteNumber });
    assert(saved, 'Quote request not found in MongoDB');
    assert.strictEqual(saved.businessName, quotePayload.businessName);
    assert.strictEqual(saved.items.length, 1);
    assert.strictEqual(saved.items[0].quantity, 25);
  });

  // 9. Authorized Dealer Price Access Verification
  await test('Authorized dealer session unlocks dealerPrice in catalog', async () => {
    // Generate valid JWT token for dealer@apexmobile.com
    const dealerUser = await prisma.user.findFirst({
      where: { email: 'dealer@apexmobile.com' },
      include: { employee: true },
    });
    assert(dealerUser, 'dealer@apexmobile.com must exist');

    const { accessToken } = generateTokens({
      userId: dealerUser.id,
      organizationId: dealerUser.organizationId,
      email: dealerUser.email,
      role: dealerUser.role,
      employeeId: dealerUser.employee?.id,
    });

    const res = await fetch(`${BASE_URL}/api/public/catalog?limit=5`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    assert(res.ok, `Dealer catalog returned ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isDealerAuthorized, true, 'Dealer must be recognized as authorized');
    // First product must now have dealerPrice visible
    assert(data.products[0].dealerPrice !== null, 'Dealer must see dealerPrice');
    assert(data.products[0].dealerPrice > 0, 'Dealer price must be a positive number');
  });

  // 10. Frontend Catalog HTML Response
  await test('GET /catalog returns 200 OK with rich UI markup', async () => {
    const res = await fetch(`${BASE_URL}/catalog`);
    assert(res.ok, `GET /catalog failed with ${res.status}`);
    const html = await res.text();
    assert(html.includes('Technology Collection') || html.includes('Catalog') || html.includes('APEX ELECTRONICS'));
  });

  // 11. Frontend Product Details HTML Response
  await test('GET /catalog/[id] returns 200 OK', async () => {
    assert(firstProductId, 'Need firstProductId');
    const res = await fetch(`${BASE_URL}/catalog/${firstProductId}`);
    assert(res.ok, `GET /catalog/[id] failed with ${res.status}`);
  });

  console.log('================================================================');
  console.log(`📊 CATALOG TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runCatalogSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
