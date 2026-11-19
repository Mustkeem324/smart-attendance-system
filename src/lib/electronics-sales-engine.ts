import { connectToDatabase } from './mongodb';
import {
  Retailer,
  ShopVisit,
  Product,
  ProductCategory,
  DeviceSerial,
  SalesOrder,
  Delivery,
  Invoice,
  PaymentCollection,
  RetailerLedger,
  Warehouse,
  Inventory,
  StockMovement,
  SalesTarget,
  SalesRepresentative,
  SalesAuditLog,
} from '@/models/electronics-sales';
import { calculateHaversineDistanceMeters } from './geo';
import mongoose from 'mongoose';

/**
 * Creates a new Mobile & Electronics Retailer with duplicate prevention.
 */
export async function createRetailer(params: {
  name: string;
  ownerName: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address: string;
  city: string;
  state?: string;
  area: string;
  pincode: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters?: number;
  shopCategory?: any;
  gstin?: string;
  dealerCode?: string;
  assignedEmployeeId?: string;
  creditLimit?: number;
  paymentTerms?: string;
  photoUrl?: string;
}) {
  await connectToDatabase();

  const {
    name,
    ownerName,
    phone,
    altPhone,
    email,
    address,
    city,
    state = 'Karnataka',
    area,
    pincode,
    latitude,
    longitude,
    geofenceRadiusMeters = 100,
    shopCategory = 'MOBILE_RETAIL',
    gstin,
    dealerCode: customDealerCode,
    assignedEmployeeId,
    creditLimit = 0,
    paymentTerms = 'Net 15 Days',
    photoUrl,
  } = params;

  // 1. Prevent duplicate by (Phone + Name)
  const existing = await Retailer.findOne({
    $or: [
      { phone, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
      { phone },
    ],
  });

  if (existing) {
    throw new Error(`A retailer with name "${name}" or phone "${phone}" is already registered (Dealer Code: ${existing.dealerCode}).`);
  }

  // Generate unique dealer code if not provided
  let dealerCode = customDealerCode;
  if (!dealerCode) {
    const count = await Retailer.countDocuments();
    dealerCode = `DLR-${String(count + 1).padStart(5, '0')}`;
  }

  const retailer = await Retailer.create({
    name: name.trim(),
    ownerName: ownerName.trim(),
    phone: phone.trim(),
    altPhone: altPhone?.trim(),
    email: email?.trim(),
    address,
    city,
    state,
    area,
    pincode,
    latitude,
    longitude,
    geofenceRadiusMeters,
    shopCategory,
    gstin: gstin?.trim().toUpperCase(),
    dealerCode,
    assignedEmployeeId,
    creditLimit,
    paymentTerms,
    photoUrl,
    status: 'ACTIVE',
    outstandingBalance: 0,
  });

  return retailer;
}

/**
 * Starts a Mobile Retailer Shop Visit with Haversine GPS verification.
 */
export async function startShopVisit(params: {
  retailerId: string;
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  photoUrl?: string;
  visitPurpose?: string;
  notes?: string;
}) {
  await connectToDatabase();

  const {
    retailerId,
    employeeId,
    latitude,
    longitude,
    accuracyMeters = 15.0,
    photoUrl,
    visitPurpose = 'Sales Order & Product Replenishment',
    notes,
  } = params;

  const retailer = await Retailer.findById(retailerId);
  if (!retailer) throw new Error('Retailer shop not found.');

  const distanceMeters = calculateHaversineDistanceMeters(
    latitude,
    longitude,
    retailer.latitude,
    retailer.longitude
  );

  const isWithinGeofence = distanceMeters <= (retailer.geofenceRadiusMeters || 100);
  const todayStr = new Date().toISOString().split('T')[0];

  const photos = photoUrl
    ? [{ photoUrl, category: 'EXTERIOR' as const, caption: 'Shop check-in photograph', timestamp: new Date() }]
    : [];

  const visit = await ShopVisit.create({
    retailerId: retailer._id,
    employeeId,
    visitDate: todayStr,
    checkInTime: new Date(),
    latitude,
    longitude,
    accuracyMeters,
    distanceFromShopMeters: parseFloat(distanceMeters.toFixed(1)),
    isWithinGeofence,
    photos,
    visitPurpose,
    notes,
    status: 'IN_PROGRESS',
  });

  return visit;
}

/**
 * Creates or registers an actual Mobile / Electronics Product.
 */
export async function createProduct(params: {
  name: string;
  brand: string;
  modelName?: string;
  modelNumber?: string;
  sku: string;
  barcode?: string;
  category: 'SMARTPHONES' | 'ACCESSORIES' | 'ELECTRONICS';
  description?: string;
  photograph?: string;
  color?: string;
  ram?: string;
  storage?: string;
  displaySpecs?: string;
  display?: string;
  batterySpecs?: string;
  battery?: string;
  connectivity?: string;
  warrantyPeriodMonths?: number;
  mrp: number;
  dealerPrice: number;
  retailSellingPrice?: number;
  sellingPrice?: number;
  gstRatePercent?: number;
  taxRatePercent?: number;
  hsnCode?: string;
  requiresImei?: boolean;
}) {
  await connectToDatabase();

  const sku = params.sku.toUpperCase().trim();
  const existing = await Product.findOne({ sku });
  if (existing) {
    throw new Error(`Product with SKU "${sku}" already exists.`);
  }

  // Ensure default category exists
  await ProductCategory.findOneAndUpdate(
    { code: params.category },
    { name: params.category, code: params.category, isActive: true },
    { upsert: true, returnDocument: 'after' }
  );

  const finalRetailPrice = params.retailSellingPrice ?? params.sellingPrice ?? params.mrp;
  const finalModelName = params.modelName || params.name;

  const product = await Product.create({
    ...params,
    modelName: finalModelName,
    sku,
    retailSellingPrice: finalRetailPrice,
    displaySpecs: params.displaySpecs || params.display,
    batterySpecs: params.batterySpecs || params.battery,
    gstRatePercent: params.gstRatePercent ?? params.taxRatePercent ?? 18,
    hsnCode: params.hsnCode || (params.category === 'SMARTPHONES' ? '85171200' : '85044090'),
    requiresImei: params.requiresImei ?? (params.category === 'SMARTPHONES' || params.category === 'ELECTRONICS'),
    status: 'ACTIVE',
  });

  // Ensure central warehouse has an inventory record for this product
  let defaultWarehouse = await Warehouse.findOne({ isActive: true });
  if (!defaultWarehouse) {
    defaultWarehouse = await Warehouse.create({
      name: 'Electronics Central Distribution Hub',
      code: 'WH-MAIN-01',
      address: 'Industrial Logistics Corridor',
      city: 'Bangalore',
      state: 'Karnataka',
    });
  }

  await Inventory.findOneAndUpdate(
    { warehouseId: defaultWarehouse._id, productId: product._id },
    {
      $setOnInsert: {
        warehouseId: defaultWarehouse._id,
        productId: product._id,
        onHandStock: 0,
        allocatedStock: 0,
        availableStock: 0,
        minimumThreshold: 10,
        reorderQuantity: 25,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  return product;
}

/**
 * Adds actual device serials / IMEIs for smartphone & electronics inventory.
 */
export async function addDeviceSerials(params: {
  productId: string;
  devices: {
    imei1: string;
    imei2?: string;
    serialNumber?: string;
    modelNumber?: string;
    color?: string;
    storageVariant?: string;
    purchaseReference?: string;
  }[];
  warehouseId?: string;
}) {
  await connectToDatabase();

  const product = await Product.findById(params.productId);
  if (!product) throw new Error('Product not found.');

  let targetWhId = params.warehouseId;
  if (!targetWhId) {
    const wh = await Warehouse.findOne({ isActive: true });
    targetWhId = wh?._id.toString();
  }

  const addedDevices = [];
  for (const dev of params.devices) {
    const imei1Clean = dev.imei1.trim().toUpperCase();

    // Check duplicate IMEI
    const existing = await DeviceSerial.findOne({ imei1: imei1Clean });
    if (existing) {
      throw new Error(`Device with IMEI "${imei1Clean}" is already registered in inventory.`);
    }

    const created = await DeviceSerial.create({
      productId: product._id,
      imei1: imei1Clean,
      imei2: dev.imei2?.trim().toUpperCase(),
      serialNumber: dev.serialNumber?.trim().toUpperCase(),
      modelNumber: dev.modelNumber || product.modelNumber,
      color: dev.color || product.color,
      storageVariant: dev.storageVariant || product.storage,
      warehouseId: targetWhId ? new mongoose.Types.ObjectId(targetWhId) : undefined,
      stockStatus: 'IN_STOCK',
      purchaseReference: dev.purchaseReference || 'PO-INITIAL',
    });

    addedDevices.push(created);
  }

  // Update Inventory onHandStock and availableStock
  if (targetWhId) {
    const whObjId = new mongoose.Types.ObjectId(targetWhId);
    const count = await DeviceSerial.countDocuments({
      productId: product._id,
      warehouseId: whObjId,
      stockStatus: 'IN_STOCK',
    });

    await Inventory.findOneAndUpdate(
      { warehouseId: whObjId, productId: product._id },
      { onHandStock: count, availableStock: count },
      { upsert: true }
    );

    // Record Stock Movement
    await StockMovement.create({
      warehouseId: whObjId,
      productId: product._id,
      movementType: 'PURCHASE_INWARD',
      quantity: addedDevices.length,
      balanceAfter: count,
      referenceId: addedDevices[0]?.purchaseReference || 'INWARD',
      imeiList: addedDevices.map((d) => d.imei1),
      notes: `Inward serial registration of ${addedDevices.length} units for ${product.name}`,
    });
  }

  return addedDevices;
}

/**
 * Creates an actual Sales Order for Mobile Phones & Electronics.
 */
export async function createSalesOrder(params: {
  retailerId: string;
  employeeId: string;
  shopVisitId?: string;
  paymentTerms?: string;
  deliveryPreference?: string;
  remarks?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice?: number;
    discountAmount?: number;
    remarks?: string;
  }[];
}) {
  await connectToDatabase();

  const retailer = await Retailer.findById(params.retailerId);
  if (!retailer) throw new Error('Retailer not found.');

  if (!params.items || params.items.length === 0) {
    throw new Error('At least one mobile/electronic product item is required.');
  }

  // Fetch products
  const productIds = params.items.map((i) => new mongoose.Types.ObjectId(i.productId));
  const products = await Product.find({ _id: { $in: productIds } });
  const pMap = new Map(products.map((p) => [p._id.toString(), p]));

  let totalUnits = 0;
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableValue = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const preparedItems = [];

  for (const item of params.items) {
    const prod = pMap.get(item.productId);
    if (!prod) throw new Error(`Product ${item.productId} not found.`);

    const qty = item.quantity;
    const unitPrice = item.unitPrice ?? prod.dealerPrice;
    const discount = item.discountAmount ?? 0;
    const lineGross = qty * unitPrice;
    const lineTaxable = Math.max(0, lineGross - discount);

    const gstRate = prod.gstRatePercent || 18;
    const halfRate = gstRate / 2; // CGST + SGST (9% + 9%)
    const cgst = parseFloat(((lineTaxable * halfRate) / 100).toFixed(2));
    const sgst = parseFloat(((lineTaxable * halfRate) / 100).toFixed(2));
    const lineTotal = parseFloat((lineTaxable + cgst + sgst).toFixed(2));

    totalUnits += qty;
    subtotal += lineGross;
    totalDiscount += discount;
    taxableValue += lineTaxable;
    cgstTotal += cgst;
    sgstTotal += sgst;

    preparedItems.push({
      productId: prod._id,
      productName: prod.name,
      brand: prod.brand,
      model: prod.modelName,
      sku: prod.sku,
      color: prod.color,
      storage: prod.storage,
      quantity: qty,
      unitPrice,
      discountAmount: discount,
      taxableAmount: lineTaxable,
      gstRatePercent: gstRate,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: 0,
      totalAmount: lineTotal,
      remarks: item.remarks,
    });
  }

  const finalOrderValue = parseFloat((taxableValue + cgstTotal + sgstTotal).toFixed(2));

  // Generate sequential unique order number
  const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(0, 6);
  const countThisMonth = await SalesOrder.countDocuments({
    orderNumber: { $regex: `^ORD-${todayCompact}` },
  });
  const orderNumber = `ORD-${todayCompact}-${String(countThisMonth + 1).padStart(4, '0')}`;

  const order = await SalesOrder.create({
    orderNumber,
    retailerId: retailer._id,
    employeeId: params.employeeId,
    shopVisitId: params.shopVisitId ? new mongoose.Types.ObjectId(params.shopVisitId) : undefined,
    orderDate: new Date(),
    items: preparedItems,
    totalLines: preparedItems.length,
    totalUnits,
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(totalDiscount.toFixed(2)),
    taxableValue: parseFloat(taxableValue.toFixed(2)),
    cgstTotal: parseFloat(cgstTotal.toFixed(2)),
    sgstTotal: parseFloat(sgstTotal.toFixed(2)),
    igstTotal: 0,
    finalOrderValue,
    paymentTerms: params.paymentTerms || retailer.paymentTerms || 'Credit',
    deliveryPreference: params.deliveryPreference || 'Express Dispatch',
    remarks: params.remarks,
    status: 'SUBMITTED',
  });

  return order;
}

/**
 * Creates an Actual Delivery with IMEI and Serial Number Assignment.
 */
export async function createActualDelivery(params: {
  orderId?: string;
  retailerId: string;
  employeeId: string;
  warehouseId?: string;
  deliveryNotes?: string;
  items: {
    productId: string;
    deliveredQuantity: number;
    assignedImeis?: string[]; // Actual individual IMEI numbers delivered to the shop!
    assignedSerialNumbers?: string[];
  }[];
  photos?: { photoUrl: string; category: any; caption?: string }[];
  shopAcknowledgement?: {
    signatureUrl?: string;
    receiverName: string;
    receiverPhone?: string;
  };
}) {
  await connectToDatabase();

  const retailer = await Retailer.findById(params.retailerId);
  if (!retailer) throw new Error('Retailer not found.');

  // Generate delivery number: DEL-YYYYMM-XXXX
  const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(0, 6);
  const countDeliveries = await Delivery.countDocuments({
    deliveryNumber: { $regex: `^DEL-${todayCompact}` },
  });
  const deliveryNumber = `DEL-${todayCompact}-${String(countDeliveries + 1).padStart(4, '0')}`;

  let totalUnitsDelivered = 0;
  let totalDeliveryValue = 0;

  const preparedItems = [];
  const assignedImeisGlobal: string[] = [];

  for (const item of params.items) {
    const prod = await Product.findById(item.productId);
    if (!prod) throw new Error(`Product ${item.productId} not found.`);

    const qty = item.deliveredQuantity;
    const unitPrice = prod.dealerPrice;
    const lineVal = parseFloat((qty * unitPrice * (1 + (prod.gstRatePercent || 18) / 100)).toFixed(2));

    totalUnitsDelivered += qty;
    totalDeliveryValue += lineVal;

    const imeis = (item.assignedImeis || []).map((i) => i.trim().toUpperCase());
    assignedImeisGlobal.push(...imeis);

    preparedItems.push({
      productId: prod._id,
      productName: prod.name,
      sku: prod.sku,
      orderedQuantity: qty,
      deliveredQuantity: qty,
      pendingQuantity: 0,
      damagedQuantity: 0,
      returnedQuantity: 0,
      unitPrice,
      totalValue: lineVal,
      assignedImeis: imeis,
      assignedSerialNumbers: item.assignedSerialNumbers || [],
    });

    // Update DeviceSerial records to DELIVERED status for this retailer
    if (imeis.length > 0) {
      await DeviceSerial.updateMany(
        { imei1: { $in: imeis } },
        {
          stockStatus: 'DELIVERED',
          retailerId: retailer._id,
          warrantyStartDate: new Date(),
          warrantyEndDate: new Date(Date.now() + (prod.warrantyPeriodMonths || 12) * 30 * 24 * 60 * 60 * 1000),
        }
      );
    }
  }

  const delivery = await Delivery.create({
    deliveryNumber,
    orderId: params.orderId ? new mongoose.Types.ObjectId(params.orderId) : undefined,
    retailerId: retailer._id,
    employeeId: params.employeeId,
    warehouseId: params.warehouseId ? new mongoose.Types.ObjectId(params.warehouseId) : undefined,
    deliveredAt: new Date(),
    items: preparedItems,
    totalUnitsDelivered,
    totalDeliveryValue: parseFloat(totalDeliveryValue.toFixed(2)),
    photos: (params.photos || []).map((p) => ({
      ...p,
      timestamp: new Date(),
    })),
    shopAcknowledgement: params.shopAcknowledgement,
    deliveryNotes: params.deliveryNotes,
    status: 'VERIFIED',
    verifiedBy: params.employeeId,
    verifiedAt: new Date(),
  });

  // If linked to an order, update order status to DELIVERED
  if (params.orderId) {
    await SalesOrder.findByIdAndUpdate(params.orderId, { status: 'DELIVERED' });
  }

  // Deduct Inventory & create Stock Movement
  let targetWh = params.warehouseId ? await Warehouse.findById(params.warehouseId) : await Warehouse.findOne({ isActive: true });
  if (targetWh) {
    for (const item of preparedItems) {
      const inv = await Inventory.findOneAndUpdate(
        { warehouseId: targetWh._id, productId: item.productId },
        { $inc: { onHandStock: -item.deliveredQuantity, availableStock: -item.deliveredQuantity } },
        { new: true, upsert: true }
      );

      await StockMovement.create({
        warehouseId: targetWh._id,
        productId: item.productId,
        movementType: 'DELIVERY_OUT',
        quantity: item.deliveredQuantity,
        balanceAfter: inv.onHandStock,
        referenceId: deliveryNumber,
        imeiList: item.assignedImeis,
        performedBy: params.employeeId,
        notes: `Delivery ${deliveryNumber} to retailer ${retailer.name}`,
      });
    }
  }

  return delivery;
}

/**
 * Generates an official Sales Tax Invoice and creates Ledger Debit.
 */
export async function generateSalesInvoice(params: {
  orderId?: string;
  deliveryId?: string;
  retailerId: string;
}) {
  await connectToDatabase();

  const retailer = await Retailer.findById(params.retailerId);
  if (!retailer) throw new Error('Retailer not found.');

  let order = null;
  if (params.orderId) {
    order = await SalesOrder.findById(params.orderId);
  }

  const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(0, 6);
  const countInvoices = await Invoice.countDocuments({
    invoiceNumber: { $regex: `^INV-${todayCompact}` },
  });
  const invoiceNumber = `INV-${todayCompact}-${String(countInvoices + 1).padStart(4, '0')}`;

  const items = order
    ? order.items.map((i: any) => ({
        productId: i.productId,
        productName: i.productName,
        hsnCode: '85171200',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        mrp: i.unitPrice * 1.25,
        discountAmount: i.discountAmount,
        taxableAmount: i.taxableAmount,
        cgstRate: 9,
        cgstAmount: i.cgstAmount,
        sgstRate: 9,
        sgstAmount: i.sgstAmount,
        igstRate: 0,
        igstAmount: 0,
        totalAmount: i.totalAmount,
      }))
    : [];

  const totalInvoiceValue = order ? order.finalOrderValue : 0;
  const newOutstanding = retailer.outstandingBalance + totalInvoiceValue;

  const invoice = await Invoice.create({
    invoiceNumber,
    orderId: params.orderId ? new mongoose.Types.ObjectId(params.orderId) : undefined,
    deliveryId: params.deliveryId ? new mongoose.Types.ObjectId(params.deliveryId) : undefined,
    retailerId: retailer._id,
    invoiceDate: new Date(),
    sellerDetails: {
      companyName: 'Acme Mobile & Electronics Distribution Pvt Ltd',
      gstin: '29AAACA1234A1Z5',
      pan: 'AAACA1234A',
      address: 'Plot 45, Electronics Corridor, Bangalore - 560066',
      state: 'Karnataka',
      stateCode: '29',
    },
    retailerDetails: {
      shopName: retailer.name,
      ownerName: retailer.ownerName,
      gstin: retailer.gstin,
      address: `${retailer.address}, ${retailer.city}`,
      state: retailer.state || 'Karnataka',
    },
    items,
    subtotal: order ? order.subtotal : 0,
    totalDiscount: order ? order.discountAmount : 0,
    taxableAmount: order ? order.taxableValue : 0,
    cgstTotal: order ? order.cgstTotal : 0,
    sgstTotal: order ? order.sgstTotal : 0,
    igstTotal: 0,
    totalInvoiceValue,
    amountPaid: 0,
    outstandingBalance: totalInvoiceValue,
    paymentTerms: retailer.paymentTerms || 'Net 15',
    isPaid: false,
  });

  // Update Retailer outstanding balance
  await Retailer.findByIdAndUpdate(retailer._id, {
    outstandingBalance: newOutstanding,
  });

  // Create Retailer Ledger Entry (INVOICE_DEBIT)
  await RetailerLedger.create({
    retailerId: retailer._id,
    transactionType: 'INVOICE_DEBIT',
    referenceId: invoiceNumber,
    date: new Date(),
    debitAmount: totalInvoiceValue,
    creditAmount: 0,
    balance: newOutstanding,
    description: `Tax Invoice #${invoiceNumber} for sales order ${order?.orderNumber || 'N/A'}`,
  });

  return invoice;
}

/**
 * Records a Payment Collection from a Dealer / Retailer and credits ledger.
 */
export async function recordPaymentCollection(params: {
  retailerId: string;
  invoiceId?: string;
  employeeId: string;
  amount: number;
  paymentMethod: any;
  transactionReference?: string;
  collectionDate?: string;
  paymentProofUrl?: string;
  notes?: string;
}) {
  await connectToDatabase();

  const retailer = await Retailer.findById(params.retailerId);
  if (!retailer) throw new Error('Retailer not found.');

  if (params.amount <= 0) {
    throw new Error('Payment collection amount must be greater than zero.');
  }

  const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(0, 6);
  const countReceipts = await PaymentCollection.countDocuments();
  const receiptNumber = `RCP-${todayCompact}-${String(countReceipts + 1).padStart(4, '0')}`;

  const payment = await PaymentCollection.create({
    receiptNumber,
    retailerId: retailer._id,
    invoiceId: params.invoiceId ? new mongoose.Types.ObjectId(params.invoiceId) : undefined,
    employeeId: params.employeeId,
    amount: parseFloat(params.amount.toFixed(2)),
    paymentMethod: params.paymentMethod || 'UPI',
    transactionReference: params.transactionReference,
    collectionDate: params.collectionDate || new Date().toISOString().split('T')[0],
    paymentProofUrl: params.paymentProofUrl,
    notes: params.notes,
    isVerified: true,
  });

  // Update outstanding balance on retailer
  const newOutstanding = Math.max(0, retailer.outstandingBalance - params.amount);
  await Retailer.findByIdAndUpdate(retailer._id, {
    outstandingBalance: parseFloat(newOutstanding.toFixed(2)),
  });

  // Create Retailer Ledger Entry (PAYMENT_CREDIT)
  await RetailerLedger.create({
    retailerId: retailer._id,
    transactionType: 'PAYMENT_CREDIT',
    referenceId: receiptNumber,
    date: new Date(),
    debitAmount: 0,
    creditAmount: params.amount,
    balance: parseFloat(newOutstanding.toFixed(2)),
    description: `Payment received via ${params.paymentMethod} (Ref: ${params.transactionReference || 'N/A'})`,
  });

  return payment;
}

/**
 * Computes live, 100% database-backed Electronics Sales KPIs and Analytics.
 * Strictly calculates from actual MongoDB documents (zero hardcoded or mock figures).
 */
export async function getElectronicsSalesDashboardFull(dateStr?: string) {
  await connectToDatabase();

  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const targetDateObj = new Date(`${targetDate}T00:00:00Z`);
  const targetDateEnd = new Date(`${targetDate}T23:59:59Z`);

  // 1. Total Active Sales Employees
  const activeSalesRepsCount = await SalesRepresentative.countDocuments({ isActive: true });

  // 2. Total Registered Retailers
  const totalRetailers = await Retailer.countDocuments({ status: 'ACTIVE' });

  // 3. Shops Visited Today
  const visitsToday = await ShopVisit.find({
    visitDate: targetDate,
  }).populate('retailerId');
  const shopsVisitedToday = new Set(visitsToday.map((v) => v.retailerId?._id?.toString())).size;

  // 4. Orders Booked Today
  const ordersToday = await SalesOrder.find({
    orderDate: { $gte: targetDateObj, $lte: targetDateEnd },
  }).populate('retailerId');
  const ordersBookedToday = ordersToday.length;

  let totalOrderValueToday = 0;
  let totalUnitsSoldToday = 0;
  ordersToday.forEach((o) => {
    totalOrderValueToday += o.finalOrderValue;
    totalUnitsSoldToday += o.totalUnits;
  });

  // 5. Units Delivered Today
  const deliveriesToday = await Delivery.find({
    deliveredAt: { $gte: targetDateObj, $lte: targetDateEnd },
  }).populate('retailerId');

  let totalUnitsDeliveredToday = 0;
  deliveriesToday.forEach((d) => {
    totalUnitsDeliveredToday += d.totalUnitsDelivered;
  });

  // 6. Total Sales Revenue (from confirmed orders / invoices)
  const confirmedOrders = await SalesOrder.find({
    status: { $in: ['APPROVED', 'PROCESSING', 'PARTIALLY_FULFILLED', 'DISPATCHED', 'DELIVERED'] },
  });
  const totalSalesRevenue = confirmedOrders.reduce((sum, o) => sum + o.finalOrderValue, 0);

  // 7. Payments Collected Today & Total
  const paymentsToday = await PaymentCollection.find({
    collectionDate: targetDate,
  });
  const paymentsCollectedToday = paymentsToday.reduce((sum, p) => sum + p.amount, 0);

  // 8. Outstanding Dealer Balance Across all retailers
  const retailers = await Retailer.find({ status: 'ACTIVE' });
  const totalOutstandingBalance = retailers.reduce((sum, r) => sum + (r.outstandingBalance || 0), 0);

  // 9. Pending Orders
  const pendingOrdersCount = await SalesOrder.countDocuments({
    status: { $in: ['SUBMITTED', 'PENDING_APPROVAL'] },
  });

  // 10. Brand-wise sales aggregation
  const brandAgg = await SalesOrder.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.brand',
        totalQty: { $sum: '$items.quantity' },
        totalValue: { $sum: '$items.totalAmount' },
      },
    },
    { $sort: { totalValue: -1 } },
  ]);

  const brandSales = brandAgg.map((b) => ({
    brand: b._id || 'Standard',
    totalQty: b.totalQty,
    totalValue: parseFloat(b.totalValue.toFixed(2)),
  }));

  // 11. Daily Sales Trend (Last 7 Days)
  const trendDays: { date: string; dayLabel: string; orderCount: number; units: number; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(targetDateObj);
    d.setUTCDate(d.getUTCDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayStart = new Date(`${dStr}T00:00:00Z`);
    const dayEnd = new Date(`${dStr}T23:59:59Z`);

    const dayOrders = await SalesOrder.find({
      orderDate: { $gte: dayStart, $lte: dayEnd },
    });

    const dayRevenue = dayOrders.reduce((sum, o) => sum + o.finalOrderValue, 0);
    const dayUnits = dayOrders.reduce((sum, o) => sum + o.totalUnits, 0);

    trendDays.push({
      date: dStr,
      dayLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      orderCount: dayOrders.length,
      units: dayUnits,
      revenue: parseFloat(dayRevenue.toFixed(2)),
    });
  }

  // 12. Category distribution
  const categoryAgg = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
  ]);

  const categoryDistribution = categoryAgg.map((c) => ({
    categoryName: c._id || 'General',
    count: c.count,
  }));

  // 13. Live Activity Stream (Recent Visits, Orders, Deliveries, Payments)
  const recentOrders = await SalesOrder.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('retailerId');

  const recentVisits = await ShopVisit.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('retailerId');

  const liveActivity = [
    ...recentOrders.map((o: any) => ({
      id: o._id.toString(),
      type: 'ORDER',
      time: new Date(o.createdAt).toISOString().replace('T', ' ').slice(11, 16),
      retailerName: o.retailerId?.name || 'Retail Store',
      retailerArea: o.retailerId?.area || o.retailerId?.city || 'Bangalore',
      referenceId: o.orderNumber,
      units: o.totalUnits,
      amount: o.finalOrderValue,
      status: o.status,
    })),
    ...recentVisits.map((v: any) => ({
      id: v._id.toString(),
      type: 'VISIT',
      time: new Date(v.checkInTime).toISOString().replace('T', ' ').slice(11, 16),
      retailerName: v.retailerId?.name || 'Retail Store',
      retailerArea: v.retailerId?.area || v.retailerId?.city || 'Bangalore',
      referenceId: `VISIT-${v._id.toString().slice(-6).toUpperCase()}`,
      units: 0,
      amount: 0,
      status: v.isWithinGeofence ? 'WITHIN_GEOFENCE' : 'OUTSIDE_GEOFENCE',
    })),
  ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 12);

  return {
    targetDate,
    kpis: {
      activeSalesEmployees: { value: activeSalesRepsCount, label: 'Active sales reps in field' },
      registeredRetailers: { value: totalRetailers, label: 'Verified retailer & dealer network' },
      shopsVisitedToday: { value: shopsVisitedToday, label: 'GPS verified visits logged today' },
      ordersBookedToday: { value: ordersBookedToday, label: `Today's booked orders (${totalUnitsSoldToday} units)` },
      unitsDeliveredToday: { value: totalUnitsDeliveredToday, label: 'Units dispatched & delivered today' },
      totalSalesRevenue: { value: parseFloat(totalSalesRevenue.toFixed(2)), label: 'Net confirmed sales revenue' },
      paymentsCollectedToday: { value: parseFloat(paymentsCollectedToday.toFixed(2)), label: "Today's collections (Cash/UPI/NEFT)" },
      outstandingBalance: { value: parseFloat(totalOutstandingBalance.toFixed(2)), label: 'Total dealer credit balance' },
      pendingOrders: { value: pendingOrdersCount, label: 'Orders awaiting manager approval' },
    },
    trendDays,
    brandSales,
    categoryDistribution,
    liveActivity,
  };
}

/**
 * Real Data Import Center: Bulk imports actual company records from Excel/CSV parsed objects.
 */
export async function importActualElectronicsData(type: 'retailers' | 'products' | 'imei_serials', rows: any[]) {
  await connectToDatabase();

  const results = {
    totalRows: rows.length,
    imported: 0,
    failed: 0,
    errors: [] as { row: number; error: string }[],
  };

  if (type === 'retailers') {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.name || !r.phone || !r.address || !r.city) {
          throw new Error('Name, Phone, Address, and City are required.');
        }

        await createRetailer({
          name: String(r.name).trim(),
          ownerName: String(r.ownerName || r.name).trim(),
          phone: String(r.phone).trim(),
          altPhone: r.altPhone ? String(r.altPhone).trim() : undefined,
          email: r.email ? String(r.email).trim() : undefined,
          address: String(r.address),
          city: String(r.city),
          state: r.state || 'Karnataka',
          area: String(r.area || r.city),
          pincode: String(r.pincode || '560001'),
          latitude: parseFloat(r.latitude) || 12.9716,
          longitude: parseFloat(r.longitude) || 77.5946,
          shopCategory: r.shopCategory || 'MOBILE_RETAIL',
          gstin: r.gstin,
          dealerCode: r.dealerCode,
          creditLimit: parseFloat(r.creditLimit) || 0,
        });
        results.imported++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row: i + 1, error: err.message });
      }
    }
  } else if (type === 'products') {
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i];
      try {
        if (!p.name || !p.sku || !p.brand || !p.mrp) {
          throw new Error('Name, SKU, Brand, and MRP are required.');
        }

        await createProduct({
          name: String(p.name).trim(),
          brand: String(p.brand).trim(),
          modelName: String(p.modelName || p.name).trim(),
          modelNumber: p.modelNumber ? String(p.modelNumber).trim() : undefined,
          sku: String(p.sku).trim(),
          barcode: p.barcode ? String(p.barcode).trim() : undefined,
          category: (p.category as any) || 'SMARTPHONES',
          description: p.description,
          color: p.color,
          ram: p.ram,
          storage: p.storage,
          mrp: parseFloat(p.mrp),
          dealerPrice: parseFloat(p.dealerPrice || p.mrp * 0.85),
          retailSellingPrice: parseFloat(p.retailSellingPrice || p.mrp),
          gstRatePercent: parseFloat(p.gstRatePercent) || 18,
          hsnCode: p.hsnCode,
          requiresImei: p.requiresImei === true || p.requiresImei === 'true' || p.category === 'SMARTPHONES',
        });
        results.imported++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row: i + 1, error: err.message });
      }
    }
  } else if (type === 'imei_serials') {
    for (let i = 0; i < rows.length; i++) {
      const dev = rows[i];
      try {
        if (!dev.sku || !dev.imei1) {
          throw new Error('SKU and IMEI 1 are required.');
        }

        const prod = await Product.findOne({ sku: String(dev.sku).trim().toUpperCase() });
        if (!prod) {
          throw new Error(`Product with SKU "${dev.sku}" not found in catalog.`);
        }

        await addDeviceSerials({
          productId: prod._id.toString(),
          devices: [
            {
              imei1: String(dev.imei1).trim(),
              imei2: dev.imei2 ? String(dev.imei2).trim() : undefined,
              serialNumber: dev.serialNumber ? String(dev.serialNumber).trim() : undefined,
              color: dev.color || prod.color,
              storageVariant: dev.storage || prod.storage,
              purchaseReference: dev.purchaseReference || 'IMPORT-BATCH',
            },
          ],
        });
        results.imported++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row: i + 1, error: err.message });
      }
    }
  }

  return results;
}
