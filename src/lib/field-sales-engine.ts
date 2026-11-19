import { prisma } from './prisma';
import { calculateHaversineDistanceMeters } from './geo';
import { DeliveryStatus, VisitStatus, PaymentMode, StockMovementType, ShopCategory, PhotoCategory } from '@prisma/client';

export interface DeliveryItemInput {
  productId: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice?: number;
  discountAmount?: number;
  taxAmount?: number;
  remarks?: string;
}

export interface DeliveryPhotoInput {
  photoUrl: string;
  category: PhotoCategory;
  caption?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}

/**
 * Creates a new Retailer Shop with duplicate prevention check.
 */
export async function createShop(params: {
  organizationId: string;
  name: string;
  ownerName: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address: string;
  city: string;
  area: string;
  pincode: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters?: number;
  category?: ShopCategory;
  assignedEmployeeId?: string;
}) {
  const {
    organizationId,
    name,
    ownerName,
    phone,
    altPhone,
    email,
    address,
    city,
    area,
    pincode,
    latitude,
    longitude,
    geofenceRadiusMeters = 100.0,
    category = 'GENERAL',
    assignedEmployeeId,
  } = params;

  // 1. Prevent duplicate by (Name + Phone) within organization
  const existing = await prisma.shop.findFirst({
    where: {
      organizationId,
      OR: [
        { name: { equals: name, mode: 'insensitive' }, phone },
        { phone },
      ],
    },
  });

  if (existing) {
    throw new Error(`A shop with name "${name}" or phone "${phone}" is already registered (Shop ID: ${existing.id}).`);
  }

  // 2. Create Shop
  const shop = await prisma.shop.create({
    data: {
      organizationId,
      name,
      ownerName,
      phone,
      altPhone: altPhone || null,
      email: email || null,
      address,
      city,
      area,
      pincode,
      latitude,
      longitude,
      geofenceRadiusMeters,
      category,
      assignedEmployeeId: assignedEmployeeId || null,
      status: 'ACTIVE',
    },
  });

  // If assigned, create assignment record
  if (assignedEmployeeId) {
    await prisma.shopAssignment.create({
      data: {
        organizationId,
        shopId: shop.id,
        employeeId: assignedEmployeeId,
      },
    });
  }

  return shop;
}

/**
 * Assigns or reassigns a shop to an employee.
 */
export async function assignShopToEmployee(params: {
  organizationId: string;
  shopId: string;
  employeeId: string;
  notes?: string;
}) {
  const { organizationId, shopId, employeeId, notes } = params;

  return await prisma.$transaction(async (tx) => {
    // Update shop
    const shop = await tx.shop.update({
      where: { id: shopId },
      data: { assignedEmployeeId: employeeId },
    });

    // Deactivate previous active assignments
    await tx.shopAssignment.updateMany({
      where: { shopId, isActive: true },
      data: { isActive: false },
    });

    // Create new assignment
    const assignment = await tx.shopAssignment.create({
      data: {
        organizationId,
        shopId,
        employeeId,
        notes,
        isActive: true,
      },
    });

    return { shop, assignment };
  });
}

/**
 * Starts a Field Shop Visit with GPS verification.
 */
export async function startShopVisit(params: {
  organizationId: string;
  shopId: string;
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  photoUrl?: string;
  notes?: string;
}) {
  const {
    organizationId,
    shopId,
    employeeId,
    latitude,
    longitude,
    accuracyMeters = 15.0,
    photoUrl,
    notes,
  } = params;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
  });

  if (!shop) throw new Error('Shop not found.');

  // Calculate distance from registered shop coordinates
  const distanceMeters = calculateHaversineDistanceMeters(
    latitude,
    longitude,
    shop.latitude,
    shop.longitude
  );

  const isWithinGeofence = distanceMeters <= shop.geofenceRadiusMeters;
  const todayStr = new Date().toISOString().split('T')[0];

  const visit = await prisma.shopVisit.create({
    data: {
      organizationId,
      shopId,
      employeeId,
      visitDate: todayStr,
      checkInTime: new Date(),
      latitude,
      longitude,
      accuracyMeters,
      distanceFromShopMeters: parseFloat(distanceMeters.toFixed(1)),
      isWithinGeofence,
      photoUrl,
      notes,
      status: VisitStatus.IN_PROGRESS,
    },
    include: { shop: true },
  });

  return visit;
}

/**
 * Checks out / completes a shop visit.
 */
export async function completeShopVisit(visitId: string, notes?: string) {
  const visit = await prisma.shopVisit.findUnique({
    where: { id: visitId },
  });

  if (!visit) throw new Error('Visit record not found.');

  return await prisma.shopVisit.update({
    where: { id: visitId },
    data: {
      checkOutTime: new Date(),
      status: VisitStatus.COMPLETED,
      ...(notes ? { notes: `${visit.notes || ''}\nCheckout Note: ${notes}`.trim() } : {}),
    },
  });
}

/**
 * Creates a Product Delivery with multiple item lines and photographs.
 */
export async function createDeliveryEntry(params: {
  organizationId: string;
  shopId: string;
  employeeId: string;
  shopVisitId?: string;
  deliveryNotes?: string;
  customerSignatureUrl?: string;
  items: DeliveryItemInput[];
  photos?: DeliveryPhotoInput[];
  saveAsDraft?: boolean;
}) {
  const {
    organizationId,
    shopId,
    employeeId,
    shopVisitId,
    deliveryNotes,
    customerSignatureUrl,
    items,
    photos = [],
    saveAsDraft = false,
  } = params;

  if (!items || items.length === 0) {
    throw new Error('At least one delivered product item is required.');
  }

  // Fetch product catalog details to verify prices & taxes
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, organizationId },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Calculate totals
  let totalQuantity = 0;
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  const preparedItems: {
    productId: string;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    totalPrice: number;
    remarks?: string;
  }[] = [];

  for (const item of items) {
    const prod = productMap.get(item.productId);
    if (!prod) throw new Error(`Product with ID "${item.productId}" not found.`);

    const qty = item.quantity;
    const unitPrice = item.unitPrice ?? prod.sellingPrice;
    const lineDiscount = item.discountAmount ?? 0;
    const taxableAmount = Math.max(0, qty * unitPrice - lineDiscount);
    const taxRate = prod.taxRatePercent || 0;
    const lineTax = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
    const lineTotal = parseFloat((taxableAmount + lineTax).toFixed(2));

    totalQuantity += qty;
    subtotal += qty * unitPrice;
    totalDiscount += lineDiscount;
    totalTax += lineTax;

    preparedItems.push({
      productId: item.productId,
      quantity: qty,
      unitOfMeasure: item.unitOfMeasure || prod.unitOfMeasure,
      unitPrice,
      discountAmount: lineDiscount,
      taxAmount: lineTax,
      totalPrice: lineTotal,
      remarks: item.remarks,
    });
  }

  const finalDeliveryValue = parseFloat((subtotal - totalDiscount + totalTax).toFixed(2));
  const deliveryStatus = saveAsDraft ? DeliveryStatus.DRAFT : DeliveryStatus.SUBMITTED;

  // Generate unique delivery reference number: DEL-YYYYMMDD-XXXX
  const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const countToday = await prisma.delivery.count({
    where: { organizationId, deliveryNumber: { startsWith: `DEL-${todayCompact}` } },
  });
  const deliveryNumber = `DEL-${todayCompact}-${String(countToday + 1).padStart(4, '0')}`;

  const delivery = await prisma.$transaction(async (tx) => {
    // 1. Create delivery header
    const created = await tx.delivery.create({
      data: {
        organizationId,
        deliveryNumber,
        shopId,
        employeeId,
        shopVisitId: shopVisitId || null,
        status: deliveryStatus,
        totalLines: preparedItems.length,
        totalQuantity,
        subtotal: parseFloat(subtotal.toFixed(2)),
        discountAmount: parseFloat(totalDiscount.toFixed(2)),
        taxAmount: parseFloat(totalTax.toFixed(2)),
        finalDeliveryValue,
        deliveryNotes,
        customerSignatureUrl,
        items: {
          create: preparedItems,
        },
      },
      include: {
        items: { include: { product: true } },
        shop: true,
        employee: true,
      },
    });

    // 2. Attach photographs
    if (photos.length > 0) {
      for (const p of photos) {
        await tx.deliveryPhoto.create({
          data: {
            deliveryId: created.id,
            shopVisitId: shopVisitId || null,
            photoUrl: p.photoUrl,
            category: p.category,
            caption: p.caption || null,
            latitude: p.latitude || null,
            longitude: p.longitude || null,
            accuracyMeters: p.accuracyMeters || null,
          },
        });
      }
    }

    // 3. Create Audit Log
    await tx.deliveryAuditLog.create({
      data: {
        organizationId,
        deliveryId: created.id,
        action: saveAsDraft ? 'DELIVERY_DRAFT_CREATED' : 'DELIVERY_SUBMITTED',
        details: {
          deliveryNumber,
          totalLines: preparedItems.length,
          finalValue: finalDeliveryValue,
        },
      },
    });

    return created;
  });

  return delivery;
}

/**
 * Reviews (Approve/Reject) a Delivery and updates warehouse stock.
 */
export async function processDeliveryVerification(params: {
  deliveryId: string;
  reviewerUserId: string;
  action: 'APPROVE' | 'REJECT';
  remarks?: string;
  warehouseId?: string; // Target warehouse for inventory deduction upon approval
}) {
  const { deliveryId, reviewerUserId, action, remarks, warehouseId } = params;

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      items: true,
      shop: true,
      employee: true,
    },
  });

  if (!delivery) throw new Error('Delivery not found.');
  if (delivery.status === DeliveryStatus.VERIFIED) {
    throw new Error('Delivery is already verified.');
  }

  const newStatus = action === 'APPROVE' ? DeliveryStatus.VERIFIED : DeliveryStatus.REJECTED;

  return await prisma.$transaction(async (tx) => {
    // 1. Update delivery status
    const updated = await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: newStatus,
        verifiedAt: new Date(),
        verifiedByUserId: reviewerUserId,
        rejectionReason: action === 'REJECT' ? remarks || 'Rejected by reviewer' : null,
      },
      include: { items: true, shop: true, employee: true },
    });

    // 2. Create verification history record
    await tx.deliveryVerification.create({
      data: {
        deliveryId,
        reviewerUserId,
        action,
        remarks: remarks || (action === 'APPROVE' ? 'Approved delivery record' : 'Rejected'),
      },
    });

    // 3. If APPROVED: Deduct inventory stock if warehouse is available
    if (action === 'APPROVE') {
      let targetWarehouseId = warehouseId;
      if (!targetWarehouseId) {
        const defaultWh = await tx.warehouse.findFirst({
          where: { organizationId: delivery.organizationId, isActive: true },
        });
        targetWarehouseId = defaultWh?.id;
      }

      if (targetWarehouseId) {
        for (const item of delivery.items) {
          // Fetch or create inventory entry
          const inv = await tx.inventory.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: targetWarehouseId,
                productId: item.productId,
              },
            },
            update: {
              currentStock: { decrement: item.quantity },
            },
            create: {
              organizationId: delivery.organizationId,
              warehouseId: targetWarehouseId,
              productId: item.productId,
              currentStock: -item.quantity,
            },
          });

          // Record stock movement audit
          await tx.stockMovement.create({
            data: {
              organizationId: delivery.organizationId,
              warehouseId: targetWarehouseId,
              productId: item.productId,
              movementType: StockMovementType.DELIVERY_OUT,
              quantity: item.quantity,
              balanceAfter: inv.currentStock,
              referenceId: delivery.deliveryNumber,
              notes: `Stock deducted for delivery ${delivery.deliveryNumber} to ${delivery.shop.name}`,
              performedByUserId: reviewerUserId,
            },
          });
        }
      }
    }

    // 4. Create Audit Log
    await tx.deliveryAuditLog.create({
      data: {
        organizationId: delivery.organizationId,
        deliveryId: delivery.id,
        userId: reviewerUserId,
        action: action === 'APPROVE' ? 'DELIVERY_VERIFIED' : 'DELIVERY_REJECTED',
        details: { remarks, newStatus },
      },
    });

    return updated;
  });
}

/**
 * Records a payment collection for a shop or delivery.
 */
export async function recordPaymentCollection(params: {
  organizationId: string;
  shopId: string;
  deliveryId?: string;
  employeeId: string;
  amount: number;
  paymentMode?: PaymentMode;
  paymentReference?: string;
  paymentProofUrl?: string;
  collectedDate?: string;
  notes?: string;
}) {
  const {
    organizationId,
    shopId,
    deliveryId,
    employeeId,
    amount,
    paymentMode = 'CASH',
    paymentReference,
    paymentProofUrl,
    collectedDate = new Date().toISOString().split('T')[0],
    notes,
  } = params;

  if (amount <= 0) throw new Error('Payment amount must be greater than zero.');

  const payment = await prisma.paymentCollection.create({
    data: {
      organizationId,
      shopId,
      deliveryId: deliveryId || null,
      employeeId,
      amount: parseFloat(amount.toFixed(2)),
      paymentMode,
      paymentReference,
      paymentProofUrl,
      collectedDate,
      notes,
      isVerified: true,
    },
    include: { shop: true, employee: true, delivery: true },
  });

  return payment;
}

/**
 * Calculates high-level Field Sales & Delivery Dashboard Metrics.
 */
export async function getFieldSalesMetrics(organizationId: string, dateStr?: string) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  // 1. Total shops
  const totalShops = await prisma.shop.count({
    where: { organizationId, status: 'ACTIVE' },
  });

  // 2. Active field employees (employees who have shop visits or deliveries)
  const activeEmployeesCount = await prisma.employee.count({
    where: {
      organizationId,
      employmentStatus: 'ACTIVE',
      OR: [
        { shopVisits: { some: { visitDate: targetDate } } },
        { assignedShops: { some: {} } },
      ],
    },
  });

  // 3. Shops visited today
  const visitedToday = await prisma.shopVisit.findMany({
    where: { organizationId, visitDate: targetDate },
    distinct: ['shopId'],
  });
  const shopsVisitedTodayCount = visitedToday.length;

  // 4. Deliveries submitted today
  const deliveriesToday = await prisma.delivery.findMany({
    where: {
      organizationId,
      createdAt: {
        gte: new Date(`${targetDate}T00:00:00Z`),
        lte: new Date(`${targetDate}T23:59:59Z`),
      },
    },
    include: { items: true },
  });

  const totalDeliveriesToday = deliveriesToday.length;
  let totalProductsDelivered = 0;
  let totalQuantityDelivered = 0;
  let totalDeliveryValue = 0;
  let pendingVerificationCount = 0;
  let rejectedCount = 0;

  deliveriesToday.forEach((del) => {
    totalProductsDelivered += del.totalLines;
    totalQuantityDelivered += del.totalQuantity;
    totalDeliveryValue += del.finalDeliveryValue;
    if (del.status === 'SUBMITTED' || del.status === 'PENDING_VERIFICATION') pendingVerificationCount++;
    if (del.status === 'REJECTED') rejectedCount++;
  });

  // 5. Total payments collected today
  const paymentsToday = await prisma.paymentCollection.findMany({
    where: { organizationId, collectedDate: targetDate },
  });
  const totalPaymentsCollected = paymentsToday.reduce((sum, p) => sum + p.amount, 0);

  return {
    targetDate,
    totalShops,
    activeEmployeesCount: Math.max(1, activeEmployeesCount),
    shopsVisitedTodayCount,
    totalDeliveriesToday,
    totalProductsDelivered,
    totalQuantityDelivered,
    totalDeliveryValue: parseFloat(totalDeliveryValue.toFixed(2)),
    totalPaymentsCollected: parseFloat(totalPaymentsCollected.toFixed(2)),
    pendingVerificationCount,
    rejectedCount,
  };
}

/**
 * Enterprise Field Sales & Distribution Full Dashboard Analytics Engine
 */
export async function getFieldSalesDashboardFullData(params: {
  organizationId: string;
  dateStr?: string;
  branchId?: string;
  employeeId?: string;
}) {
  const { organizationId, dateStr, branchId, employeeId } = params;
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const targetDateObj = new Date(`${targetDate}T00:00:00Z`);

  // Calculate yesterday for comparison
  const yesterdayObj = new Date(targetDateObj);
  yesterdayObj.setUTCDate(yesterdayObj.getUTCDate() - 1);
  const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

  // Base employee filter
  const empWhere: any = { organizationId, employmentStatus: 'ACTIVE' };
  if (branchId) empWhere.branchId = branchId;
  if (employeeId) empWhere.id = employeeId;

  // 1. Total Sales Reps
  const salesReps = await prisma.employee.findMany({
    where: empWhere,
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      profilePhoto: true,
      designation: true,
      department: { select: { name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
  const totalSalesReps = salesReps.length;

  // 2. Shops Registered
  const shopWhere: any = { organizationId, status: 'ACTIVE' };
  if (employeeId) shopWhere.assignedEmployeeId = employeeId;
  const allShops = await prisma.shop.findMany({
    where: shopWhere,
    include: {
      assignedEmployee: {
        select: { id: true, firstName: true, lastName: true },
      },
      visits: {
        take: 1,
        orderBy: { checkInTime: 'desc' },
        select: { checkInTime: true, visitDate: true },
      },
    },
  });
  const shopsRegistered = allShops.length;

  // 3. Shops Visited Today & Yesterday
  const visitTodayWhere: any = { organizationId, visitDate: targetDate };
  if (employeeId) visitTodayWhere.employeeId = employeeId;
  const visitsToday = await prisma.shopVisit.findMany({
    where: visitTodayWhere,
    include: {
      shop: true,
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, profilePhoto: true } },
    },
    orderBy: { checkInTime: 'desc' },
  });

  const distinctShopsVisitedToday = new Set(visitsToday.map((v) => v.shopId)).size;

  const visitsYesterday = await prisma.shopVisit.findMany({
    where: { organizationId, visitDate: yesterdayStr },
    distinct: ['shopId'],
  });
  const distinctShopsVisitedYesterday = visitsYesterday.length;

  // 4. Deliveries Today & Yesterday
  const delTodayWhere: any = {
    organizationId,
    createdAt: {
      gte: new Date(`${targetDate}T00:00:00Z`),
      lte: new Date(`${targetDate}T23:59:59Z`),
    },
  };
  if (employeeId) delTodayWhere.employeeId = employeeId;

  const deliveriesToday = await prisma.delivery.findMany({
    where: delTodayWhere,
    include: {
      shop: true,
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, profilePhoto: true } },
      items: { include: { product: true } },
      photos: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const delYesterdayWhere: any = {
    organizationId,
    createdAt: {
      gte: new Date(`${yesterdayStr}T00:00:00Z`),
      lte: new Date(`${yesterdayStr}T23:59:59Z`),
    },
  };
  const deliveriesYesterday = await prisma.delivery.findMany({
    where: delYesterdayWhere,
    select: { id: true, finalDeliveryValue: true, totalQuantity: true, status: true },
  });

  const deliveriesCompletedToday = deliveriesToday.filter((d) => d.status === 'VERIFIED' || d.status === 'COMPLETED').length;
  const deliveriesCompletedYesterday = deliveriesYesterday.filter((d) => d.status === 'VERIFIED' || d.status === 'COMPLETED').length;

  let totalProductsDeliveredToday = 0;
  let totalDeliveryValueToday = 0;
  let pendingVerificationCount = 0;

  deliveriesToday.forEach((d) => {
    totalProductsDeliveredToday += d.totalQuantity;
    totalDeliveryValueToday += d.finalDeliveryValue;
    if (d.status === 'SUBMITTED' || d.status === 'PENDING_VERIFICATION') {
      pendingVerificationCount++;
    }
  });

  const totalProductsDeliveredYesterday = deliveriesYesterday.reduce((acc, d) => acc + d.totalQuantity, 0);
  const totalDeliveryValueYesterday = deliveriesYesterday.reduce((acc, d) => acc + d.finalDeliveryValue, 0);

  // 5. Total Payments Collected Today & Yesterday
  const payTodayWhere: any = { organizationId, collectedDate: targetDate };
  if (employeeId) payTodayWhere.employeeId = employeeId;
  const paymentsToday = await prisma.paymentCollection.findMany({
    where: payTodayWhere,
    include: {
      shop: true,
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const totalPaymentCollectedToday = paymentsToday.reduce((acc, p) => acc + p.amount, 0);

  const paymentsYesterday = await prisma.paymentCollection.findMany({
    where: { organizationId, collectedDate: yesterdayStr },
    select: { amount: true },
  });
  const totalPaymentCollectedYesterday = paymentsYesterday.reduce((acc, p) => acc + p.amount, 0);

  // 6. Daily Delivery Trend (Last 7 Days)
  const trendDays: { date: string; dayLabel: string; deliveryCount: number; quantity: number; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(targetDateObj);
    d.setUTCDate(d.getUTCDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const dayDels = await prisma.delivery.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(`${dStr}T00:00:00Z`),
          lte: new Date(`${dStr}T23:59:59Z`),
        },
      },
      select: { id: true, totalQuantity: true, finalDeliveryValue: true },
    });

    const dayQty = dayDels.reduce((sum, item) => sum + item.totalQuantity, 0);
    const dayVal = dayDels.reduce((sum, item) => sum + item.finalDeliveryValue, 0);

    trendDays.push({
      date: dStr,
      dayLabel,
      deliveryCount: dayDels.length,
      quantity: dayQty,
      value: parseFloat(dayVal.toFixed(2)),
    });
  }

  // 7. Product Delivery Analytics (Top products & Category distribution)
  const deliveryItems = await prisma.deliveryItem.findMany({
    where: { delivery: { organizationId } },
    include: { product: { include: { category: true } } },
  });

  const productAggMap = new Map<string, { id: string; name: string; sku: string; brand: string; totalQty: number; totalValue: number; categoryName: string }>();
  const categoryAggMap = new Map<string, { categoryName: string; totalQty: number; totalValue: number }>();

  deliveryItems.forEach((item) => {
    const pId = item.productId;
    const pName = item.product.name;
    const pSku = item.product.sku;
    const pBrand = item.product.brand || 'Standard';
    const catName = item.product.category?.name || 'General';

    // Product aggregate
    const existingP = productAggMap.get(pId) || { id: pId, name: pName, sku: pSku, brand: pBrand, totalQty: 0, totalValue: 0, categoryName: catName };
    existingP.totalQty += item.quantity;
    existingP.totalValue += item.totalPrice;
    productAggMap.set(pId, existingP);

    // Category aggregate
    const existingCat = categoryAggMap.get(catName) || { categoryName: catName, totalQty: 0, totalValue: 0 };
    existingCat.totalQty += item.quantity;
    existingCat.totalValue += item.totalPrice;
    categoryAggMap.set(catName, existingCat);
  });

  const topProducts = Array.from(productAggMap.values())
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5);

  const categoryDistribution = Array.from(categoryAggMap.values()).sort((a, b) => b.totalValue - a.totalValue);

  // 8. Employee Performance (Field Rep Leaderboard)
  const employeePerformance = await Promise.all(
    salesReps.map(async (rep) => {
      const assignedCount = await prisma.shop.count({
        where: { organizationId, assignedEmployeeId: rep.id },
      });

      const repVisits = await prisma.shopVisit.findMany({
        where: { organizationId, employeeId: rep.id },
        distinct: ['shopId'],
      });

      const repDels = await prisma.delivery.findMany({
        where: { organizationId, employeeId: rep.id },
        select: { totalQuantity: true, finalDeliveryValue: true, status: true },
      });

      const completed = repDels.filter((d) => d.status === 'VERIFIED' || d.status === 'COMPLETED').length;
      const pendingSubmissions = repDels.filter((d) => d.status === 'SUBMITTED' || d.status === 'PENDING_VERIFICATION').length;
      const totalQty = repDels.reduce((sum, d) => sum + d.totalQuantity, 0);
      const totalVal = repDels.reduce((sum, d) => sum + d.finalDeliveryValue, 0);

      return {
        id: rep.id,
        name: `${rep.firstName} ${rep.lastName}`,
        employeeCode: rep.employeeCode,
        avatar: rep.profilePhoto,
        department: rep.department?.name || 'Field Sales',
        assignedShops: assignedCount,
        shopsVisited: repVisits.length,
        deliveriesCompleted: completed,
        totalQuantityDelivered: totalQty,
        deliveryValue: parseFloat(totalVal.toFixed(2)),
        pendingSubmissions,
      };
    })
  );

  employeePerformance.sort((a, b) => b.deliveryValue - a.deliveryValue);

  // 9. Shop Performance (Top visited, Highest volume, No recent visits)
  const shopPerformance = allShops.map((s) => {
    const lastVisit = s.visits[0]?.checkInTime || null;
    const daysSinceVisit = lastVisit
      ? Math.floor((new Date().getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      id: s.id,
      name: s.name,
      ownerName: s.ownerName,
      phone: s.phone,
      address: s.address,
      city: s.city,
      area: s.area,
      category: s.category,
      assignedRep: s.assignedEmployee ? `${s.assignedEmployee.firstName} ${s.assignedEmployee.lastName}` : 'Unassigned',
      lastVisitDate: lastVisit ? new Date(lastVisit).toISOString().split('T')[0] : 'Never',
      daysSinceVisit,
      needsAttention: daysSinceVisit > 7,
      latitude: s.latitude,
      longitude: s.longitude,
    };
  });

  const shopsNeedingVisit = shopPerformance.filter((s) => s.needsAttention).slice(0, 5);

  // 10. Live Field Sales Monitor (Recent Visits & Deliveries Stream)
  const liveStreamVisits = visitsToday.slice(0, 10).map((v) => ({
    type: 'VISIT',
    id: v.id,
    time: v.checkInTime.toISOString().replace('T', ' ').slice(11, 16),
    employeeName: `${v.employee.firstName} ${v.employee.lastName}`,
    employeeCode: v.employee.employeeCode,
    employeeAvatar: v.employee.profilePhoto,
    shopName: v.shop.name,
    shopArea: `${v.shop.city} (${v.shop.area})`,
    referenceId: `VISIT-${v.id.slice(0, 8).toUpperCase()}`,
    productCount: 0,
    totalQuantity: 0,
    gpsStatus: v.isWithinGeofence ? 'WITHIN_GEOFENCE' : 'OUTSIDE_GEOFENCE',
    gpsDistance: v.distanceFromShopMeters,
    verificationStatus: v.status,
    photoUrl: v.photoUrl,
  }));

  const liveStreamDeliveries = deliveriesToday.slice(0, 10).map((d) => ({
    type: 'DELIVERY',
    id: d.id,
    time: d.createdAt.toISOString().replace('T', ' ').slice(11, 16),
    employeeName: `${d.employee.firstName} ${d.employee.lastName}`,
    employeeCode: d.employee.employeeCode,
    employeeAvatar: d.employee.profilePhoto,
    shopName: d.shop.name,
    shopArea: `${d.shop.city} (${d.shop.area})`,
    referenceId: d.deliveryNumber,
    productCount: d.totalLines,
    totalQuantity: d.totalQuantity,
    gpsStatus: d.shopVisitId ? 'VERIFIED_AT_SHOP' : 'DIRECT_DELIVERY',
    gpsDistance: 0,
    verificationStatus: d.status,
    finalValue: d.finalDeliveryValue,
    photosCount: d.photos.length,
  }));

  const combinedLiveStream = [...liveStreamDeliveries, ...liveStreamVisits].slice(0, 15);

  // 11. Automated Business Intelligence / AI Field Sales Insights
  const insights: { id: string; type: 'warning' | 'success' | 'info'; title: string; description: string; metric?: string }[] = [];

  if (pendingVerificationCount > 0) {
    insights.push({
      id: 'ins-1',
      type: 'warning',
      title: 'Pending Delivery Verifications',
      description: `${pendingVerificationCount} delivery order(s) submitted by field reps are awaiting supervisor verification.`,
      metric: `${pendingVerificationCount} Orders`,
    });
  }

  if (shopsNeedingVisit.length > 0) {
    insights.push({
      id: 'ins-2',
      type: 'info',
      title: 'Retailer Coverage Advisory',
      description: `${shopsNeedingVisit.length} registered retailer shop(s) have not received a sales representative visit in over 7 days.`,
      metric: `${shopsNeedingVisit.length} Retailers`,
    });
  }

  if (topProducts.length > 0) {
    const leadProd = topProducts[0];
    insights.push({
      id: 'ins-3',
      type: 'success',
      title: 'Top Fast-Moving Product',
      description: `"${leadProd.name}" (${leadProd.brand}) is leading delivery volume with ${leadProd.totalQty} units delivered across territories.`,
      metric: `${leadProd.totalQty} Units`,
    });
  }

  if (totalDeliveryValueToday > 0 && totalPaymentCollectedToday < totalDeliveryValueToday) {
    const uncollected = parseFloat((totalDeliveryValueToday - totalPaymentCollectedToday).toFixed(2));
    insights.push({
      id: 'ins-4',
      type: 'warning',
      title: 'Credit / Payment Gap Today',
      description: `Today's net delivery turnover is ₹${totalDeliveryValueToday.toLocaleString()}, while collections stand at ₹${totalPaymentCollectedToday.toLocaleString()}. Outstanding balance: ₹${uncollected.toLocaleString()}.`,
      metric: `₹${uncollected.toLocaleString()}`,
    });
  }

  return {
    targetDate,
    kpis: {
      totalSalesReps: {
        value: totalSalesReps,
        label: 'Active field representatives',
        delta: 0,
        status: 'default',
      },
      shopsRegistered: {
        value: shopsRegistered,
        label: 'Active retail stores in network',
        delta: Math.round((shopsRegistered / Math.max(1, shopsRegistered)) * 100),
        status: 'success',
      },
      shopsVisitedToday: {
        value: distinctShopsVisitedToday,
        label: 'Retail stores visited today',
        delta: distinctShopsVisitedToday - distinctShopsVisitedYesterday,
        status: distinctShopsVisitedToday > 0 ? 'success' : 'warning',
      },
      deliveriesCompleted: {
        value: deliveriesCompletedToday,
        label: 'Verified & completed deliveries',
        delta: deliveriesCompletedToday - deliveriesCompletedYesterday,
        status: deliveriesCompletedToday > 0 ? 'success' : 'default',
      },
      totalProductsDelivered: {
        value: totalProductsDeliveredToday,
        label: 'Units delivered across all lines',
        delta: totalProductsDeliveredToday - totalProductsDeliveredYesterday,
        status: 'success',
      },
      pendingVerification: {
        value: pendingVerificationCount,
        label: 'Awaiting manager approval',
        delta: pendingVerificationCount,
        status: pendingVerificationCount > 0 ? 'warning' : 'success',
      },
      totalDeliveryValue: {
        value: parseFloat(totalDeliveryValueToday.toFixed(2)),
        label: "Today's gross delivery value",
        delta: parseFloat((totalDeliveryValueToday - totalDeliveryValueYesterday).toFixed(2)),
        status: 'success',
      },
      totalPaymentCollected: {
        value: parseFloat(totalPaymentCollectedToday.toFixed(2)),
        label: "Today's collections (Cash/UPI/Cheque)",
        delta: parseFloat((totalPaymentCollectedToday - totalPaymentCollectedYesterday).toFixed(2)),
        status: 'success',
      },
    },
    trendDays,
    topProducts,
    categoryDistribution,
    employeePerformance,
    shopPerformance,
    shopsNeedingVisit,
    combinedLiveStream,
    insights,
    mapShops: shopPerformance.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      assignedRep: s.assignedRep,
      category: s.category,
      daysSinceVisit: s.daysSinceVisit,
    })),
  };
}
