import { connectToDatabase } from '../src/lib/mongodb';
import {
  Retailer,
  Product,
  DeviceSerial,
  SalesOrder,
  Delivery,
  Invoice,
  PaymentCollection,
  RetailerLedger,
  Warehouse,
  Inventory,
  StockMovement,
} from '../src/models/electronics-sales';
import {
  createRetailer,
  createProduct,
  addDeviceSerials,
  startShopVisit,
  createSalesOrder,
  createActualDelivery,
  generateSalesInvoice,
  recordPaymentCollection,
  importActualElectronicsData,
  getElectronicsSalesDashboardFull,
} from '../src/lib/electronics-sales-engine';

async function runElectronicsTestSuite() {
  console.log('===============================================================');
  console.log('🚀 RUNNING MOBILE & ELECTRONICS SALES MANAGEMENT TEST SUITE');
  console.log('===============================================================');

  await connectToDatabase();
  console.log('✅ Connected to MongoDB 7.0 database');

  // Clean test artifacts to start fresh
  await Promise.all([
    Retailer.deleteMany({ phone: { $in: ['9811002233', '9811002234', '9822019944', '9833124567'] } }),
    Product.deleteMany({ sku: { $in: ['TEST-S24U-256', 'TEST-ANK-65W', 'SAM-S24U-256-GRY', 'ANK-65W-GAN-BLK'] } }),
    DeviceSerial.deleteMany({ imei1: { $in: ['860123456789001', '860123456789002', '354891110023451', '354891110023453'] } }),
  ]);

  let testRetailer: any;
  let testPhoneProduct: any;
  let testAccessoryProduct: any;
  let testOrder: any;
  let testInvoice: any;
  let testDelivery: any;

  // -------------------------------------------------------------------------
  // TEST 1: Real Retailer Registration with Duplicate Prevention
  // -------------------------------------------------------------------------
  console.log('\n--- Test 1: Real Retailer Registration & Duplicate Prevention ---');
  testRetailer = await createRetailer({
    name: 'Apex Mobile Hub',
    ownerName: 'Vikas Malhotra',
    phone: '9811002233',
    address: 'Shop 10, Brigade Road',
    city: 'Bangalore',
    state: 'Karnataka',
    area: 'Brigade Road',
    pincode: '560001',
    latitude: 12.9716,
    longitude: 77.5946,
    geofenceRadiusMeters: 100,
    shopCategory: 'MOBILE_RETAIL',
    gstin: '29ABCDE1234F1Z5',
    creditLimit: 1000000,
    paymentTerms: 'Net 15 Days',
  });

  if (!testRetailer._id || !testRetailer.dealerCode.startsWith('DLR-')) {
    throw new Error('Failed to create retailer or invalid dealer code');
  }
  console.log(`✅ Retailer created: ${testRetailer.name} with Dealer Code: ${testRetailer.dealerCode}`);

  // Test duplicate phone/name prevention
  let dupCaught = false;
  try {
    await createRetailer({
      name: 'Apex Mobile Hub',
      ownerName: 'Duplicate Person',
      phone: '9811002233',
      address: 'Another address',
      city: 'Bangalore',
      area: 'Brigade Road',
      pincode: '560001',
      latitude: 12.9716,
      longitude: 77.5946,
    });
  } catch (err: any) {
    dupCaught = true;
    console.log(`✅ Duplicate retailer prevented successfully: "${err.message}"`);
  }
  if (!dupCaught) throw new Error('Duplicate retailer registration should have failed!');

  // -------------------------------------------------------------------------
  // TEST 2: Smartphone & Accessory Product Catalog Creation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Smartphone & Accessory Catalog Creation ---');
  testPhoneProduct = await createProduct({
    name: 'Samsung Galaxy S24 Ultra 5G (Titanium Black, 256GB)',
    brand: 'Samsung',
    modelName: 'SM-S928B',
    sku: 'TEST-S24U-256',
    category: 'SMARTPHONES',
    ram: '12GB',
    storage: '256GB',
    display: '6.8" AMOLED 120Hz',
    battery: '5000 mAh',
    mrp: 129999,
    dealerPrice: 110000,
    sellingPrice: 119999,
    taxRatePercent: 18,
    hsnCode: '85171200',
    requiresImei: true,
  });

  testAccessoryProduct = await createProduct({
    name: 'Anker PowerPort 65W GaN Fast Charger',
    brand: 'Anker',
    modelName: 'A2663',
    sku: 'TEST-ANK-65W',
    category: 'ACCESSORIES',
    mrp: 3999,
    dealerPrice: 2200,
    sellingPrice: 2899,
    taxRatePercent: 18,
    hsnCode: '85044090',
    requiresImei: false,
  });

  if (!testPhoneProduct._id || testPhoneProduct.hsnCode !== '85171200' || !testPhoneProduct.requiresImei) {
    throw new Error('Smartphone product fields validation failed');
  }
  if (!testAccessoryProduct._id || testAccessoryProduct.hsnCode !== '85044090' || testAccessoryProduct.requiresImei) {
    throw new Error('Accessory product fields validation failed');
  }
  console.log(`✅ Smartphone created: ${testPhoneProduct.name} [SKU: ${testPhoneProduct.sku}, HSN: ${testPhoneProduct.hsnCode}]`);
  console.log(`✅ Accessory created: ${testAccessoryProduct.name} [SKU: ${testAccessoryProduct.sku}, HSN: ${testAccessoryProduct.hsnCode}]`);

  // -------------------------------------------------------------------------
  // TEST 3: IMEI & Serial Inwarding with Duplicate Rejection
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: IMEI & Serial Number Management ---');
  const imeiRes = await addDeviceSerials({
    productId: testPhoneProduct._id.toString(),
    devices: [
      {
        imei1: '860123456789001',
        imei2: '860123456789002',
        serialNumber: 'SN-SAM-001A',
        batchNumber: 'LOT-TEST-01',
        warrantyMonths: 12,
      },
      {
        imei1: '860123456789002', // same as imei2 of above or different
        imei2: '860123456789003',
        serialNumber: 'SN-SAM-001B',
        batchNumber: 'LOT-TEST-01',
        warrantyMonths: 12,
      },
    ],
  });

  if (imeiRes.length === 0) throw new Error('Failed to inward device serials');
  console.log(`✅ Inwarded ${imeiRes.length} physical IMEI device serials into warehouse stock`);

  // Test duplicate IMEI rejection
  let dupImeiCaught = false;
  try {
    await addDeviceSerials({
      productId: testPhoneProduct._id.toString(),
      devices: [
        {
          imei1: '860123456789001', // Already inwarded
          serialNumber: 'SN-SAM-DUP',
        },
      ],
    });
  } catch (err: any) {
    dupImeiCaught = true;
    console.log(`✅ Duplicate IMEI 1 rejected successfully: "${err.message}"`);
  }
  if (!dupImeiCaught) throw new Error('Duplicate IMEI should have been rejected!');

  // -------------------------------------------------------------------------
  // TEST 4: Shop Visit Check-in & GPS Geofence Verification
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Shop Visit with Haversine Geofencing ---');
  const visit = await startShopVisit({
    retailerId: testRetailer._id.toString(),
    employeeId: 'emp-sales-01',
    latitude: 12.9718, // ~25m from 12.9716, 77.5946
    longitude: 77.5947,
    accuracyMeters: 5,
    purpose: 'STORE_AUDIT_AND_ORDER_BOOKING',
    photos: [
      {
        photoUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58',
        category: 'STORE_EXTERIOR',
        caption: 'Store front display verification',
      },
    ],
  });

  if (!visit._id || !visit.isWithinGeofence) {
    throw new Error('Shop visit geofence verification failed');
  }
  console.log(
    `✅ Shop visit recorded. Geofence verified: ${visit.isWithinGeofence}, Distance: ${Math.round(visit.distanceFromShopMeters)}m`
  );

  // -------------------------------------------------------------------------
  // TEST 5: Sales Order Booking with CGST/SGST Taxes
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Sales Order Booking & Tax Computation ---');
  testOrder = await createSalesOrder({
    retailerId: testRetailer._id.toString(),
    employeeId: 'emp-sales-01',
    paymentTerms: 'NET_15',
    items: [
      {
        productId: testPhoneProduct._id.toString(),
        quantity: 1,
        unitPrice: 110000,
        taxRatePercent: 18,
      },
      {
        productId: testAccessoryProduct._id.toString(),
        quantity: 2,
        unitPrice: 2500,
        taxRatePercent: 18,
      },
    ],
  });

  // Math verification:
  // Subtotal = 110000 + 5000 = 115000
  // CGST (9%) = 115000 * 0.09 = 10350
  // SGST (9%) = 115000 * 0.09 = 10350
  // Total = 115000 + 20700 = 135700
  if (testOrder.subtotal !== 115000 || testOrder.finalOrderValue !== 135700) {
    throw new Error(`Order calculation error! Got subtotal=${testOrder.subtotal}, finalOrderValue=${testOrder.finalOrderValue}`);
  }
  if (testOrder.cgstTotal !== 10350 || testOrder.sgstTotal !== 10350) {
    throw new Error(`Tax calculation error! Got CGST=${testOrder.cgstTotal}, SGST=${testOrder.sgstTotal}`);
  }
  console.log(`✅ Order booked: ${testOrder.orderNumber} | Subtotal: ₹${testOrder.subtotal} | CGST: ₹${testOrder.cgstTotal} | SGST: ₹${testOrder.sgstTotal} | Total: ₹${testOrder.finalOrderValue}`);

  // -------------------------------------------------------------------------
  // TEST 6: Order Approval & Automatic GST Tax Invoice Generation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Order Approval & Tax Invoice Generation ---');
  testOrder.status = 'APPROVED';
  testOrder.approvedBy = 'admin-user-01';
  testOrder.approvedAt = new Date();
  await testOrder.save();

  testInvoice = await generateSalesInvoice({
    orderId: testOrder._id.toString(),
    retailerId: testRetailer._id.toString(),
  });

  if (!testInvoice._id || !testInvoice.invoiceNumber.startsWith('INV-')) {
    throw new Error('Failed to generate tax invoice');
  }
  if (testInvoice.totalInvoiceValue !== 135700) {
    throw new Error(`Invoice amount does not match order amount. Got ${testInvoice.totalInvoiceValue}`);
  }

  // Check Retailer Ledger for INVOICE_DEBIT
  const ledgerDebit = await RetailerLedger.findOne({
    retailerId: testRetailer._id,
    referenceId: testInvoice.invoiceNumber,
    transactionType: 'INVOICE_DEBIT',
  });
  if (!ledgerDebit || ledgerDebit.debitAmount !== 135700) {
    throw new Error('Ledger debit entry not found or amount incorrect');
  }

  // Check Retailer updated outstanding balance
  const updatedRetailerAfterInvoice = await Retailer.findById(testRetailer._id);
  if (updatedRetailerAfterInvoice?.outstandingBalance !== 135700) {
    throw new Error(`Retailer balance not updated properly. Expected 135700, got ${updatedRetailerAfterInvoice?.outstandingBalance}`);
  }
  console.log(`✅ GST Tax Invoice generated: ${testInvoice.invoiceNumber} for ₹${testInvoice.totalInvoiceValue}`);
  console.log(`✅ Dealer ledger charged with debit: ₹${ledgerDebit.debitAmount}. New outstanding: ₹${updatedRetailerAfterInvoice.outstandingBalance}`);

  // -------------------------------------------------------------------------
  // TEST 7: Actual Product Delivery with IMEI Assignment & Stock Movement
  // -------------------------------------------------------------------------
  console.log('\n--- Test 7: Product Delivery with IMEI Assignment ---');
  testDelivery = await createActualDelivery({
    orderId: testOrder._id.toString(),
    retailerId: testRetailer._id.toString(),
    employeeId: 'emp-sales-01',
    deliveryNotes: 'Delivered in mint condition with factory seals intact',
    items: [
      {
        productId: testPhoneProduct._id.toString(),
        deliveredQuantity: 1,
        assignedImeis: ['860123456789001'],
      },
    ],
    shopAcknowledgement: {
      receiverName: 'Vikas Malhotra (Owner)',
      receiverPhone: '9811002233',
    },
  });

  if (!testDelivery._id || !testDelivery.deliveryNumber.startsWith('DEL-')) {
    throw new Error('Failed to record delivery');
  }

  // Verify DeviceSerial transitioned to DELIVERED
  const deliveredDevice = await DeviceSerial.findOne({ imei1: '860123456789001' });
  if (!deliveredDevice || deliveredDevice.stockStatus !== 'DELIVERED') {
    throw new Error('DeviceSerial was not updated to DELIVERED');
  }
  if (deliveredDevice.retailerId?.toString() !== testRetailer._id.toString()) {
    throw new Error('Delivered DeviceSerial retailerId was not assigned');
  }

  // Verify StockMovement recorded
  const stockOutMovement = await StockMovement.findOne({
    productId: testPhoneProduct._id,
    movementType: 'DELIVERY_OUT',
  });
  if (!stockOutMovement) {
    throw new Error('StockMovement DELIVERY_OUT not recorded');
  }
  console.log(`✅ Delivery dispatched: ${testDelivery.deliveryNumber}`);
  console.log(`✅ Device IMEI ${deliveredDevice.imei1} transitioned to status: ${deliveredDevice.stockStatus}`);
  console.log(`✅ Stock movement logged: ${stockOutMovement.movementType} (-${stockOutMovement.quantity} units)`);

  // -------------------------------------------------------------------------
  // TEST 8: Payment Collection & Ledger Reconciliation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 8: Payment Collection & Ledger Reconciliation ---');
  const payment = await recordPaymentCollection({
    retailerId: testRetailer._id.toString(),
    invoiceId: testInvoice._id.toString(),
    employeeId: 'emp-sales-01',
    amount: 50000,
    paymentMethod: 'UPI',
    transactionReference: 'UPI-TEST-992182749',
    notes: 'Part payment collected via GPay QR on delivery',
  });

  if (!payment._id || !payment.receiptNumber.startsWith('RCP-')) {
    throw new Error('Failed to record payment collection');
  }

  // Check Retailer Ledger for PAYMENT_CREDIT
  const ledgerCredit = await RetailerLedger.findOne({
    retailerId: testRetailer._id,
    referenceId: payment.receiptNumber,
    transactionType: 'PAYMENT_CREDIT',
  });
  if (!ledgerCredit || ledgerCredit.creditAmount !== 50000) {
    throw new Error('Ledger credit entry not found or amount incorrect');
  }

  // Check updated balance: 135700 - 50000 = 85700
  const finalRetailer = await Retailer.findById(testRetailer._id);
  if (finalRetailer?.outstandingBalance !== 85700) {
    throw new Error(`Retailer balance reconciliation error. Expected 85700, got ${finalRetailer?.outstandingBalance}`);
  }
  console.log(`✅ Payment receipt issued: ${payment.receiptNumber} for ₹${payment.amount}`);
  console.log(`✅ Dealer ledger credited. Remaining outstanding balance: ₹${finalRetailer.outstandingBalance}`);

  // -------------------------------------------------------------------------
  // TEST 9: Real Data Import Engine Validation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 9: Real Data Import Engine ---');
  const retImport = await importActualElectronicsData('retailers', [
    {
      name: 'National Telecom Store',
      ownerName: 'Amit Singhania',
      phone: '9833124567',
      gstin: '27AAECN7821Q1ZK',
      dealerCode: 'DLR-PUN-02',
      address: '102 FC Road',
      city: 'Pune',
      state: 'Maharashtra',
      area: 'FC Road',
      pincode: '411004',
      shopCategory: 'MULTI_BRAND_STORE',
      creditLimit: 750000,
      paymentTerms: 'NET_30',
      latitude: 18.5204,
      longitude: 73.8567,
    },
  ]);

  const prodImport = await importActualElectronicsData('products', [
    {
      name: 'Samsung Galaxy S24 Ultra 5G (Titanium Gray, 256GB)',
      brand: 'Samsung',
      modelNumber: 'SM-S928B',
      sku: 'SAM-S24U-256-GRY',
      category: 'SMARTPHONES',
      ram: '12GB',
      storage: '256GB',
      mrp: 129999,
      dealerPrice: 112000,
      retailSellingPrice: 119999,
      gstRatePercent: 18,
      hsnCode: '85171200',
      requiresImei: true,
    },
  ]);

  const imeiImport = await importActualElectronicsData('imei_serials', [
    {
      sku: 'SAM-S24U-256-GRY',
      imei1: '354891110023451',
      imei2: '354891110023452',
      serialNumber: 'R5CW10098ABC',
      batchNumber: 'LOT-2026-SAM01',
      warrantyMonths: 12,
      condition: 'BRAND_NEW',
    },
  ]);

  if (retImport.imported < 1 || prodImport.imported < 1 || imeiImport.imported < 1) {
    throw new Error('Data import center failed to import real sample records');
  }
  console.log(`✅ Bulk imported: ${retImport.imported} retailers, ${prodImport.imported} products, ${imeiImport.imported} IMEI serials`);

  // -------------------------------------------------------------------------
  // TEST 10: Real Database Dashboard Telemetry Aggregation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 10: Dashboard Telemetry & KPI Aggregation ---');
  const dashboard = await getElectronicsSalesDashboardFull();

  if (typeof dashboard.kpis.totalSalesRevenue.value !== 'number' || dashboard.kpis.registeredRetailers.value < 1) {
    throw new Error('Dashboard KPI aggregation failed');
  }
  if (!Array.isArray(dashboard.trendDays) || !Array.isArray(dashboard.brandSales)) {
    throw new Error('Dashboard chart aggregations failed');
  }
  console.log('✅ Dashboard Telemetry Aggregated:');
  console.log(`   • Total Retailers: ${dashboard.kpis.registeredRetailers.value}`);
  console.log(`   • Active Sales Reps: ${dashboard.kpis.activeSalesEmployees.value}`);
  console.log(`   • Shops Visited Today: ${dashboard.kpis.shopsVisitedToday.value}`);
  console.log(`   • Orders Booked Today: ${dashboard.kpis.ordersBookedToday.value}`);
  console.log(`   • Units Delivered Today: ${dashboard.kpis.unitsDeliveredToday.value}`);
  console.log(`   • Gross Sales Revenue: ₹${dashboard.kpis.totalSalesRevenue.value.toLocaleString('en-IN')}`);
  console.log(`   • Total Collections: ₹${dashboard.kpis.paymentsCollectedToday.value.toLocaleString('en-IN')}`);
  console.log(`   • Total Outstanding Receivable: ₹${dashboard.kpis.outstandingBalance.value.toLocaleString('en-IN')}`);
  console.log(`   • Brand Distribution Categories: ${dashboard.brandSales.length} brands tracked`);
  console.log(`   • Live Activity Events: ${dashboard.liveActivity.length} real events`);

  console.log('\n===============================================================');
  console.log('🎉 ALL 10 TESTS PASSED! ELECTRONICS SALES ENGINE VERIFIED 100%');
  console.log('===============================================================');

  process.exit(0);
}

runElectronicsTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
