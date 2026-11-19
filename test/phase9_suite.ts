import { prisma } from '../src/lib/prisma';
import {
  createShop,
  assignShopToEmployee,
  startShopVisit,
  completeShopVisit,
  createDeliveryEntry,
  processDeliveryVerification,
  recordPaymentCollection,
  getFieldSalesMetrics,
} from '../src/lib/field-sales-engine';
import { calculateHaversineDistanceMeters } from '../src/lib/geo';
import {
  DeliveryStatus,
  VisitStatus,
  PaymentMode,
  StockMovementType,
  ShopCategory,
  PhotoCategory,
  Role,
} from '@prisma/client';
import ExcelJS from 'exceljs';

async function runPhase9TestSuite() {
  console.log('====================================================');
  console.log('STARTING PHASE 9: FIELD SALES & DELIVERY ENGINE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // 0. Base Setup: Find Organization, Super Admin, and Field Sales Employee
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organization not found in database.');

    const adminUser = await prisma.user.findFirst({
      where: { organizationId: org.id, role: Role.SUPER_ADMIN },
    });
    if (!adminUser) throw new Error('Admin user not found.');

    const employee = await prisma.employee.findFirst({
      where: { organizationId: org.id, employmentStatus: 'ACTIVE' },
      include: { user: true },
    });
    if (!employee) throw new Error('Active employee not found.');

    console.log(`Environment: Organization "${org.name}", Admin "${adminUser.email}", Employee "${employee.firstName} ${employee.lastName}"\n`);

    // -------------------------------------------------------------
    // SECTION 1: SHOP REGISTRATION & DUPLICATE PREVENTION
    // -------------------------------------------------------------
    console.log('--- Section 1: Shop Registration & Duplicate Prevention ---');

    const testShopPhone = `9876${Math.floor(100000 + Math.random() * 900000)}`;
    const testShopName = `Apex Retail Supermart ${Date.now()}`;

    const shop = await createShop({
      organizationId: org.id,
      name: testShopName,
      ownerName: 'Vikram Malhotra',
      phone: testShopPhone,
      address: 'Shop 104, Trade Square, MG Road',
      city: 'Bangalore',
      area: 'Indiranagar',
      pincode: '560038',
      latitude: 12.9716,
      longitude: 77.5946,
      geofenceRadiusMeters: 150.0,
      category: ShopCategory.SUPERMARKET,
      assignedEmployeeId: employee.id,
    });

    assert(!!shop.id && shop.name === testShopName, 'Shop registered successfully with geo-coordinates and metadata');
    assert(shop.geofenceRadiusMeters === 150.0, 'Configurable geofence radius recorded correctly (150m)');

    // Test duplicate registration rejection
    let duplicateRejected = false;
    try {
      await createShop({
        organizationId: org.id,
        name: testShopName,
        ownerName: 'Vikram Malhotra',
        phone: testShopPhone,
        address: 'Duplicate Address',
        city: 'Bangalore',
        area: 'Indiranagar',
        pincode: '560038',
        latitude: 12.9716,
        longitude: 77.5946,
      });
    } catch (err: any) {
      duplicateRejected = true;
      assert(err.message.includes('already registered'), 'Duplicate check properly prevents duplicate name/phone registration');
    }
    assert(duplicateRejected, 'Duplicate shop registration safely rejected with validation error');

    // -------------------------------------------------------------
    // SECTION 2: SHOP ASSIGNMENT WORKFLOW
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Shop Assignment & Reassignment ---');

    const assignmentResult = await assignShopToEmployee({
      organizationId: org.id,
      shopId: shop.id,
      employeeId: employee.id,
      notes: 'Assigned as primary territory manager for Indiranagar zone',
    });

    assert(assignmentResult.shop.assignedEmployeeId === employee.id, 'Shop assigned to field sales representative');
    assert(assignmentResult.assignment.isActive === true, 'Shop assignment record is active');

    // -------------------------------------------------------------
    // SECTION 3: PRODUCT CATALOG & INVENTORY SETUP
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Product Catalog & Warehouse Inventory ---');

    // Create or find category
    let category = await prisma.productCategory.findFirst({
      where: { organizationId: org.id, code: 'BEV-01' },
    });
    if (!category) {
      category = await prisma.productCategory.create({
        data: {
          organizationId: org.id,
          name: 'Beverages & Soft Drinks',
          code: 'BEV-01',
          description: 'Ready to drink beverages and juices',
        },
      });
    }
    assert(!!category.id, 'Product category retrieved or created');

    // Create Product A
    const skuA = `SKU-DRK-${Date.now()}`;
    const productA = await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId: category.id,
        name: 'Organic Sparkling Lemonade 500ml',
        sku: skuA,
        barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        brand: 'PureFizz',
        unitOfMeasure: 'BOTTLE',
        costPrice: 35.0,
        sellingPrice: 60.0,
        taxRatePercent: 18.0,
        isActive: true,
      },
    });

    // Create Product B
    const skuB = `SKU-SNK-${Date.now()}`;
    const productB = await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId: category.id,
        name: 'Artisan Roasted Almonds 100g',
        sku: skuB,
        barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        brand: 'NutriBite',
        unitOfMeasure: 'PACKET',
        costPrice: 90.0,
        sellingPrice: 150.0,
        taxRatePercent: 12.0,
        isActive: true,
      },
    });

    assert(!!productA.id && !!productB.id, 'Product catalog records created with SKU and Tax specifications');

    // Warehouse & initial stock
    let warehouse = await prisma.warehouse.findFirst({
      where: { organizationId: org.id, isActive: true },
    });
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: {
          organizationId: org.id,
          name: 'Central Bangalore Distribution Hub',
          code: 'WH-BLR-01',
          address: 'Outer Ring Road Logistics Park, Mahadevapura',
          city: 'Bangalore',
          isActive: true,
        },
      });
    }

    // Initialize inventory with 500 units for Product A and 300 units for Product B
    const initialStockA = 500;
    const initialStockB = 300;

    await prisma.inventory.upsert({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: productA.id } },
      update: { currentStock: initialStockA },
      create: {
        organizationId: org.id,
        warehouseId: warehouse.id,
        productId: productA.id,
        currentStock: initialStockA,
      },
    });

    await prisma.inventory.upsert({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: productB.id } },
      update: { currentStock: initialStockB },
      create: {
        organizationId: org.id,
        warehouseId: warehouse.id,
        productId: productB.id,
        currentStock: initialStockB,
      },
    });

    assert(!!warehouse.id, 'Central warehouse and initial inventory levels established');

    // -------------------------------------------------------------
    // SECTION 4: FIELD SHOP VISIT WITH GPS HAVERSINE VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Field Shop Visit with GPS Verification ---');

    // Visit within 30 meters of shop
    const visitCheckIn = await startShopVisit({
      organizationId: org.id,
      shopId: shop.id,
      employeeId: employee.id,
      latitude: 12.9718, // ~25-30 meters away from 12.9716, 77.5946
      longitude: 77.5947,
      accuracyMeters: 8.5,
      photoUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800',
      notes: 'Arrived at shop for scheduled Tuesday replenishment stock delivery',
    });

    assert(visitCheckIn.status === VisitStatus.IN_PROGRESS, 'Visit check-in initiated with IN_PROGRESS status');
    assert(visitCheckIn.isWithinGeofence === true, 'GPS coordinates verified within 150m geofence radius');
    assert(visitCheckIn.distanceFromShopMeters < 150, `Calculated distance from shop (${visitCheckIn.distanceFromShopMeters}m) is within radius`);

    // Complete visit
    const completedVisit = await completeShopVisit(visitCheckIn.id, 'Delivery delivered and retailer verified receipt');
    assert(completedVisit.status === VisitStatus.COMPLETED, 'Visit checked out and marked COMPLETED');
    assert(!!completedVisit.checkOutTime, 'Visit checkout timestamp recorded accurately');

    // -------------------------------------------------------------
    // SECTION 5: MULTI-ITEM PRODUCT DELIVERY ENTRY & PRICING
    // -------------------------------------------------------------
    console.log('\n--- Section 5: Multi-Item Delivery Creation & Taxation ---');

    // Item 1: 50 bottles of Product A @ 60 each, discount 100, tax 18%
    // Taxable: 50 * 60 - 100 = 2900. Tax: 2900 * 0.18 = 522. Line Total: 3422
    // Item 2: 20 packets of Product B @ 150 each, discount 50, tax 12%
    // Taxable: 20 * 150 - 50 = 2950. Tax: 2950 * 0.12 = 354. Line Total: 3304
    // Expected Totals: Subtotal = 3000 + 3000 = 6000. Discount = 150. Tax = 876. Net Value = 6726.
    const qtyA = 50;
    const qtyB = 20;

    const delivery = await createDeliveryEntry({
      organizationId: org.id,
      shopId: shop.id,
      employeeId: employee.id,
      shopVisitId: completedVisit.id,
      deliveryNotes: 'Urgent weekend stock replenishment with signed invoice copy',
      customerSignatureUrl: 'https://example.com/signatures/retailer_sig.png',
      items: [
        {
          productId: productA.id,
          quantity: qtyA,
          unitPrice: 60.0,
          discountAmount: 100.0,
          remarks: 'Batch B-2026-11A',
        },
        {
          productId: productB.id,
          quantity: qtyB,
          unitPrice: 150.0,
          discountAmount: 50.0,
          remarks: 'Batch B-2026-11B',
        },
      ],
      photos: [
        {
          photoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
          category: PhotoCategory.SHOP_FRONT,
          caption: 'Store front with banner',
        },
        {
          photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
          category: PhotoCategory.DELIVERED_PRODUCTS,
          caption: 'Unloaded crates inside stockroom',
        },
      ],
    });

    assert(delivery.deliveryNumber.startsWith('DEL-'), `Unique Delivery Number generated (${delivery.deliveryNumber})`);
    assert(delivery.totalLines === 2, 'Total product lines count matches 2');
    assert(delivery.totalQuantity === 70, 'Total item quantity matches 70');
    assert(delivery.subtotal === 6000, `Subtotal matches 6000 (actual: ${delivery.subtotal})`);
    assert(delivery.discountAmount === 150, `Total discount matches 150 (actual: ${delivery.discountAmount})`);
    assert(delivery.taxAmount === 876, `Tax matches 876 (actual: ${delivery.taxAmount})`);
    assert(delivery.finalDeliveryValue === 6726, `Final net delivery value matches 6726 (actual: ${delivery.finalDeliveryValue})`);
    assert(delivery.status === DeliveryStatus.SUBMITTED, 'Delivery status set to SUBMITTED');

    // Verify attached photos
    const attachedPhotos = await prisma.deliveryPhoto.findMany({
      where: { deliveryId: delivery.id },
    });
    assert(attachedPhotos.length === 2, 'Both photographic proofs attached to delivery record');

    // -------------------------------------------------------------
    // SECTION 6: DELIVERY VERIFICATION & AUTOMATED INVENTORY DEDUCTION
    // -------------------------------------------------------------
    console.log('\n--- Section 6: Delivery Verification & Automated Inventory Ledger ---');

    const stockBeforeA = await prisma.inventory.findUnique({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: productA.id } },
    });
    const stockBeforeB = await prisma.inventory.findUnique({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: productB.id } },
    });

    assert(stockBeforeA?.currentStock === initialStockA, `Stock before delivery approval is ${initialStockA}`);
    assert(stockBeforeB?.currentStock === initialStockB, `Stock before delivery approval is ${initialStockB}`);

    // Admin verifies and approves delivery
    const verifiedDelivery = await processDeliveryVerification({
      deliveryId: delivery.id,
      reviewerUserId: adminUser.id,
      action: 'APPROVE',
      remarks: 'Verified product batch codes, physical delivery photos, and signed retailer challan',
      warehouseId: warehouse.id,
    });

    assert(verifiedDelivery.status === DeliveryStatus.VERIFIED, 'Delivery record successfully approved and marked VERIFIED');
    assert(!!verifiedDelivery.verifiedAt, 'Verification timestamp recorded');
    assert(verifiedDelivery.verifiedByUserId === adminUser.id, 'Reviewer user ID recorded');

    // Assert Inventory Deduction
    const stockAfterA = await prisma.inventory.findUnique({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: productA.id } },
    });
    const stockAfterB = await prisma.inventory.findUnique({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: productB.id } },
    });

    const expectedStockA = initialStockA - qtyA; // 500 - 50 = 450
    const expectedStockB = initialStockB - qtyB; // 300 - 20 = 280

    assert(stockAfterA?.currentStock === expectedStockA, `Product A stock properly decremented to ${expectedStockA} (actual: ${stockAfterA?.currentStock})`);
    assert(stockAfterB?.currentStock === expectedStockB, `Product B stock properly decremented to ${expectedStockB} (actual: ${stockAfterB?.currentStock})`);

    // Assert Stock Movements Ledger
    const movements = await prisma.stockMovement.findMany({
      where: { referenceId: delivery.deliveryNumber },
    });
    assert(movements.length === 2, 'StockMovement ledger contains 2 records for the verified delivery');
    assert(movements.every((m) => m.movementType === StockMovementType.DELIVERY_OUT), 'All movements flagged as DELIVERY_OUT');

    // -------------------------------------------------------------
    // SECTION 7: PAYMENT COLLECTION WORKFLOW
    // -------------------------------------------------------------
    console.log('\n--- Section 7: Payment Collection Workflow ---');

    const payment = await recordPaymentCollection({
      organizationId: org.id,
      shopId: shop.id,
      deliveryId: delivery.id,
      employeeId: employee.id,
      amount: 4000.0,
      paymentMode: PaymentMode.UPI,
      paymentReference: 'UPI/20261119/8839201',
      notes: 'Partial payment received on delivery via UPI QR Code',
    });

    assert(payment.amount === 4000.0, 'Payment collected amount recorded (₹4,000)');
    assert(payment.paymentMode === PaymentMode.UPI, 'Payment mode tracked accurately as UPI');
    assert(payment.isVerified === true, 'Payment collection marked verified');

    // -------------------------------------------------------------
    // SECTION 8: FIELD SALES METRICS AGGREGATION
    // -------------------------------------------------------------
    console.log('\n--- Section 8: Field Sales Analytics & Metrics ---');

    const metrics = await getFieldSalesMetrics(org.id);
    assert(metrics.totalShops >= 1, `Total registered shops metric > 0 (${metrics.totalShops})`);
    assert(metrics.activeEmployeesCount >= 1, `Active field reps counted (${metrics.activeEmployeesCount})`);
    assert(metrics.shopsVisitedTodayCount >= 1, `Shops visited today counted (${metrics.shopsVisitedTodayCount})`);
    assert(metrics.totalDeliveriesToday >= 1, `Deliveries today counted (${metrics.totalDeliveriesToday})`);
    assert(metrics.totalDeliveryValue >= 6726, `Total delivery turnover aggregated (${metrics.totalDeliveryValue})`);
    assert(metrics.totalPaymentsCollected >= 4000, `Total payments collected aggregated (${metrics.totalPaymentsCollected})`);

    // -------------------------------------------------------------
    // SECTION 9: MULTI-SHEET EXCEL REPORT GENERATION
    // -------------------------------------------------------------
    console.log('\n--- Section 9: Multi-Sheet Field Sales Excel Report ---');

    const deliveriesData = await prisma.delivery.findMany({
      where: { organizationId: org.id },
      include: {
        shop: true,
        employee: true,
        items: { include: { product: true } },
      },
    });

    const paymentsData = await prisma.paymentCollection.findMany({
      where: { organizationId: org.id },
      include: { shop: true, employee: true },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Attendance & Field Sales HRMS';

    // Sheet 1: Deliveries
    const delSheet = workbook.addWorksheet('Deliveries');
    delSheet.addRow(['Delivery Number', 'Shop Name', 'Sales Rep', 'Status', 'Total Qty', 'Final Value (₹)']);
    delSheet.getRow(1).font = { bold: true };
    deliveriesData.forEach((d) => {
      delSheet.addRow([
        d.deliveryNumber,
        d.shop.name,
        `${d.employee.firstName} ${d.employee.lastName}`,
        d.status,
        d.totalQuantity,
        d.finalDeliveryValue,
      ]);
    });

    // Sheet 2: Itemized Products
    const itemSheet = workbook.addWorksheet('Itemized Products');
    itemSheet.addRow(['Delivery Number', 'Product SKU', 'Product Name', 'Quantity', 'Unit Price (₹)', 'Line Total (₹)']);
    itemSheet.getRow(1).font = { bold: true };
    deliveriesData.forEach((d) => {
      d.items.forEach((item) => {
        itemSheet.addRow([
          d.deliveryNumber,
          item.product.sku,
          item.product.name,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
        ]);
      });
    });

    // Sheet 3: Payments
    const paySheet = workbook.addWorksheet('Payments Collected');
    paySheet.addRow(['Payment ID', 'Shop Name', 'Mode', 'Amount (₹)', 'Reference']);
    paySheet.getRow(1).font = { bold: true };
    paymentsData.forEach((p) => {
      paySheet.addRow([p.id, p.shop.name, p.paymentMode, p.amount, p.paymentReference || 'N/A']);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    assert(buffer.byteLength > 1000, `Multi-sheet Excel workbook created with 3 sheets (${buffer.byteLength} bytes)`);

    console.log('\n====================================================');
    console.log(`TEST SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error in Phase 9 test suite execution:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase9TestSuite();
