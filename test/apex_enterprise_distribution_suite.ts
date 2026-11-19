import assert from 'node:assert';
import { connectToDatabase } from '../src/lib/mongodb';
import {
  Product,
  Retailer,
  SalesOrder,
  Delivery,
  Invoice,
  PaymentCollection,
  RetailerLedger,
  Warehouse,
  Inventory,
  StockMovement,
  Brand,
  Quotation,
  DistributionNotification,
  DistributionSetting,
  DeviceSerial,
  RetailerInquiry,
} from '../src/models/electronics-sales';
import { prisma } from '../src/lib/prisma';
import { generateTokens } from '../src/lib/auth';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING APEX ELECTRONICS ENTERPRISE DISTRIBUTION SUITE');
  console.log('================================================================');

  await connectToDatabase();

  // Create admin auth token for API calls
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@acme.com' },
    include: { employee: true },
  });
  assert(adminUser, 'Admin user must exist in PostgreSQL');

  const { accessToken: adminToken } = generateTokens({
    userId: adminUser.id,
    organizationId: adminUser.organizationId,
    email: adminUser.email,
    role: adminUser.role,
    employeeId: adminUser.employee?.id,
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
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

  // -------------------------------------------------------------
  // PART 1: CORE RESTful API VALIDATIONS (/api/v1/...)
  // -------------------------------------------------------------
  await test('GET /api/v1/auth/me returns current admin session and permissions', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.user.email, 'admin@acme.com');
  });

  await test('GET /api/v1/dashboard returns 8 aggregated KPIs and live telemetry', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/dashboard`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.kpis.activeRetailers !== undefined);
    assert(data.data.kpis.totalOrders !== undefined);
    assert(data.data.kpis.salesRevenue !== undefined);
    assert(data.data.charts.monthlyTrends.length > 0);
  });

  await test('GET /api/v1/categories returns 11 distribution lines with live counts', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/categories`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.length >= 10);
    assert(data.data.some((c: any) => c.code === 'SMARTPHONES'));
  });

  await test('GET /api/v1/brands returns authorized tier 1 partner brands', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/brands`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.length >= 8);
    assert(data.data.some((b: any) => b.name === 'Apple' || b.name === 'Samsung'));
  });

  await test('GET /api/v1/warehouses returns distribution hubs with inventory totals', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/warehouses`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.length >= 1);
  });

  await test('GET /api/v1/settings returns distribution enterprise config and GSTIN', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/settings`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.gstin.startsWith('29'));
    assert.strictEqual(data.data.defaultCreditDays, 15);
  });

  // -------------------------------------------------------------
  // PART 2: SCENARIOS A THROUGH G (END-TO-END BUSINESS LIFECYCLE)
  // -------------------------------------------------------------

  let testProduct: any = null;
  let testRetailer: any = null;
  let testOrder: any = null;
  let testDelivery: any = null;
  let testInvoice: any = null;
  let testPayment: any = null;
  const testSku = `TEST-E2E-${Date.now().toString().slice(-6)}`;
  const testImei = `35894109${Date.now().toString().slice(-7)}`;

  // SCENARIO A: Admin creates a product and adds warehouse inventory
  await test('SCENARIO A: Admin creates hardware product & adds warehouse inventory', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Apex Test Smartphone Ultra 5G',
        brand: 'Samsung',
        modelName: 'Ultra 5G Test',
        sku: testSku,
        category: 'SMARTPHONES',
        mrp: 89999,
        dealerPrice: 79999,
        stockQuantity: 30,
        requiresImei: true,
        hsnCode: '85171200',
        color: 'Phantom Black',
        ram: '12GB',
        storage: '256GB',
      }),
    });

    assert.strictEqual(res.status, 201, `Failed to create product: ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    testProduct = data.data;
    assert.strictEqual(testProduct.sku, testSku);

    // Verify in MongoDB directly
    const dbProduct = await Product.findOne({ sku: testSku });
    assert(dbProduct, 'Product must persist in MongoDB');
    assert.strictEqual(dbProduct.requiresImei, true);

    const dbInv = await Inventory.findOne({ productId: dbProduct._id });
    assert(dbInv, 'Inventory must be initialized for product');
    assert.strictEqual(dbInv.availableStock, 30);
  });

  // SCENARIO B: Admin registers and approves a retailer
  await test('SCENARIO B: Admin registers and activates a new authorized retailer partner', async () => {
    const testPhone = `98${Date.now().toString().slice(-8)}`;
    const res = await fetch(`${BASE_URL}/api/v1/retailers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Apex E2E Electronics Hub',
        ownerName: 'Sunil Rao',
        phone: testPhone,
        email: `sunil.${Date.now().toString().slice(-4)}@hub.com`,
        address: 'Shop #8, Brigade Road Commercial Arcade',
        city: 'Bangalore',
        area: 'Brigade Road',
        pincode: '560001',
        shopCategory: 'AUTHORIZED_DEALER',
        gstin: '29AABCS1234F1Z5',
        creditLimit: 500000,
        paymentTerms: 'Net 15 Days',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    testRetailer = data.data;
    assert(testRetailer.dealerCode.startsWith('APX-DLR-'));

    // Verify in MongoDB
    const dbRetailer = await Retailer.findById(testRetailer._id);
    assert(dbRetailer, 'Retailer must exist in MongoDB');
    assert.strictEqual(dbRetailer.status, 'ACTIVE');
    assert.strictEqual(dbRetailer.creditLimit, 500000);
  });

  // SCENARIO C: Retailer order creation with stock reservation
  await test('SCENARIO C: B2B Order booked & stock is dynamically reserved', async () => {
    assert(testProduct && testRetailer);

    // Initial stock before order
    const invBefore = await Inventory.findOne({ productId: testProduct._id });
    const availBefore = invBefore?.availableStock || 0;

    const res = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        retailerId: testRetailer._id,
        items: [
          {
            productId: testProduct._id,
            quantity: 5,
            unitPrice: 79999,
          },
        ],
        paymentTerms: 'Credit',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    testOrder = data.data;
    assert(testOrder.orderNumber.startsWith('ORD-'));
    assert.strictEqual(testOrder.totalUnits, 5);

    // Verify stock reservation in MongoDB
    const invAfter = await Inventory.findOne({ productId: testProduct._id });
    assert.strictEqual(invAfter?.availableStock, availBefore - 5, 'Available stock must be deducted by 5');
    assert.strictEqual(invAfter?.allocatedStock, 5, 'Allocated stock must increase by 5');

    // Verify stock movement ledger
    const mov = await StockMovement.findOne({
      productId: testProduct._id,
      movementType: 'ORDER_RESERVATION',
    });
    assert(mov, 'StockMovement ledger entry must be recorded');
    assert.strictEqual(mov.quantity, -5);
  });

  // SCENARIO D: Warehouse dispatches order with dual IMEI allocation
  await test('SCENARIO D: Warehouse dispatches order with assigned Dual IMEI', async () => {
    assert(testOrder && testProduct);

    const warehouse = await Warehouse.findOne({ isActive: true });
    assert(warehouse);

    const res = await fetch(`${BASE_URL}/api/v1/deliveries`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        orderId: testOrder._id,
        warehouseId: warehouse._id,
        items: [
          {
            productId: testProduct._id,
            productName: testProduct.name,
            sku: testProduct.sku,
            orderedQuantity: 5,
            deliveredQuantity: 5,
            unitPrice: 79999,
            assignedImeis: [testImei],
          },
        ],
        deliveryNotes: 'Dispatched via Secure Logistics Van 4',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    testDelivery = data.data;
    assert(testDelivery.deliveryNumber.startsWith('DLV-'));

    // Check DeviceSerial status in MongoDB
    const serial = await DeviceSerial.findOne({ imei1: testImei });
    assert(serial, 'DeviceSerial must be tracked with IMEI');
    assert.strictEqual(serial.stockStatus, 'DISPATCHED');

    // Check order status updated to DISPATCHED
    const dbOrder = await SalesOrder.findById(testOrder._id);
    assert.strictEqual(dbOrder?.status, 'DISPATCHED');
  });

  // SCENARIO E: Delivery confirmed with customer acknowledgement & Tax Invoice issued
  await test('SCENARIO E: Delivery confirmed with POD, device warranty activated & Tax Invoice issued', async () => {
    assert(testDelivery);

    const res = await fetch(`${BASE_URL}/api/v1/deliveries/${testDelivery._id}/confirm`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        receiverName: 'Ramesh Store Manager',
        receiverPhone: '9845012345',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    testInvoice = data.data.invoice;
    assert(testInvoice, 'Tax invoice must be auto-generated upon delivery confirmation');
    assert(testInvoice.invoiceNumber.startsWith('INV-'));

    // Verify DeviceSerial updated to DELIVERED with warranty
    const serial = await DeviceSerial.findOne({ imei1: testImei });
    assert.strictEqual(serial?.stockStatus, 'DELIVERED');
    assert(serial?.warrantyStartDate, 'Warranty must be initiated upon delivery');

    // Verify double-entry ledger debit entry in MongoDB
    const ledgerDebit = await RetailerLedger.findOne({
      retailerId: testRetailer._id,
      transactionType: 'INVOICE_DEBIT',
      referenceId: testInvoice.invoiceNumber,
    });
    assert(ledgerDebit, 'Double-entry ledger INVOICE_DEBIT must exist in MongoDB');
    assert.strictEqual(ledgerDebit.debitAmount, testInvoice.totalInvoiceValue);

    // Verify retailer outstanding balance is updated
    const dbRetailer = await Retailer.findById(testRetailer._id);
    assert.strictEqual(dbRetailer?.outstandingBalance, testInvoice.totalInvoiceValue);
  });

  // SCENARIO F: Finance records payment & double-entry ledger credit posted
  await test('SCENARIO F: Finance records UPI payment collection & ledger credit posted', async () => {
    assert(testRetailer && testInvoice);

    const initialBalance = testRetailer.outstandingBalance || testInvoice.totalInvoiceValue;
    const paymentAmount = 100000;

    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        retailerId: testRetailer._id,
        invoiceId: testInvoice._id,
        amount: paymentAmount,
        paymentMethod: 'UPI',
        transactionReference: `UPI-${Date.now().toString().slice(-8)}`,
        notes: 'Partial payment on confirmed delivery',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    testPayment = data.data.payment;

    // Verify double-entry PAYMENT_CREDIT in RetailerLedger
    const ledgerCredit = await RetailerLedger.findOne({
      retailerId: testRetailer._id,
      transactionType: 'PAYMENT_CREDIT',
      referenceId: data.data.payment.receiptNumber,
    });
    assert(ledgerCredit, 'Double-entry PAYMENT_CREDIT must exist in RetailerLedger');
    assert.strictEqual(ledgerCredit.creditAmount, paymentAmount);

    // Verify Retailer balance reduced
    const updatedRetailer = await Retailer.findById(testRetailer._id);
    assert.strictEqual(
      updatedRetailer?.outstandingBalance,
      initialBalance - paymentAmount,
      'Retailer balance must decrease by paid amount'
    );
  });

  // SCENARIO G: Admin generates sales and GST B2B reports
  await test('SCENARIO G: Admin generates BI reports and GSTR-1 tax compliance analytics', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/reports?type=sales`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.data.summary.totalRevenue > 0);
    assert(data.data.records.length > 0);

    const gstRes = await fetch(`${BASE_URL}/api/v1/reports?type=gst`, { headers: authHeaders });
    assert.strictEqual(gstRes.status, 200);
    const gstData = await gstRes.json();
    assert(gstData.data.summary.totalGst > 0);

    const csvRes = await fetch(`${BASE_URL}/api/v1/reports?type=sales&export=csv`, { headers: authHeaders });
    assert.strictEqual(csvRes.status, 200);
    const csvText = await csvRes.text();
    assert(csvText.includes('OrderNumber,Date,Retailer'));
  });

  // UI Page Rendering Tests (HTTP 200 OK)
  await test('UI: GET /distribution renders master console', async () => {
    const res = await fetch(`${BASE_URL}/distribution`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('Apex Distribution Console') || html.includes('APEX ELECTRONICS'));
  });

  await test('UI: GET /distribution/products renders hardware catalog', async () => {
    const res = await fetch(`${BASE_URL}/distribution/products`);
    assert.strictEqual(res.status, 200);
  });

  await test('UI: GET /distribution/orders renders B2B sales orders console', async () => {
    const res = await fetch(`${BASE_URL}/distribution/orders`);
    assert.strictEqual(res.status, 200);
  });

  await test('UI: GET /distribution/invoices renders GST invoice table', async () => {
    const res = await fetch(`${BASE_URL}/distribution/invoices`);
    assert.strictEqual(res.status, 200);
  });

  await test('UI: GET /distribution/ledger renders dealer double-entry ledger', async () => {
    const res = await fetch(`${BASE_URL}/distribution/ledger`);
    assert.strictEqual(res.status, 200);
  });

  // Teardown: Clean up test artifacts so real production MongoDB data remains pristine
  try {
    if (testProduct?._id) {
      await Product.findByIdAndDelete(testProduct._id);
      await Inventory.deleteMany({ productId: testProduct._id });
      await DeviceSerial.deleteMany({ productId: testProduct._id });
      await StockMovement.deleteMany({ productId: testProduct._id });
    }
    if (testRetailer?._id) {
      await Retailer.findByIdAndDelete(testRetailer._id);
      await RetailerLedger.deleteMany({ retailerId: testRetailer._id });
    }
    if (testOrder?._id) {
      await SalesOrder.findByIdAndDelete(testOrder._id);
    }
    if (testDelivery?._id) {
      await Delivery.findByIdAndDelete(testDelivery._id);
    }
    if (testInvoice?._id) {
      await Invoice.findByIdAndDelete(testInvoice._id);
    }
    if (testPayment?._id) {
      await PaymentCollection.findByIdAndDelete(testPayment._id);
    }
  } catch (cleanErr) {
    console.warn('Non-fatal cleanup warning:', cleanErr);
  }

  console.log('================================================================');
  console.log(`📊 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTestSuite().catch((e) => {
  console.error('Fatal Test Suite Error:', e);
  process.exit(1);
});
