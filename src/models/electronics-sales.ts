import mongoose, { Schema, Document, Model } from 'mongoose';

// -------------------------------------------------------------
// 1. RETAILER / SHOP SCHEMA
// -------------------------------------------------------------
export interface IRetailer extends Document {
  name: string;
  ownerName: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  area: string;
  pincode: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  shopCategory: 'MOBILE_RETAIL' | 'MULTI_BRAND_STORE' | 'ELECTRONICS_SHOWROOM' | 'ACCESSORIES_SHOP' | 'DISTRIBUTOR' | 'WHOLESALER' | 'AUTHORIZED_DEALER' | 'OTHER';
  gstin?: string;
  dealerCode: string;
  assignedEmployeeId?: string; // Links to HRMS employeeId
  creditLimit: number;
  paymentTerms: string;
  photoUrl?: string;
  ownerPhotoUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  verificationStatus?: 'VERIFIED' | 'PENDING_VERIFICATION' | 'REJECTED' | 'DUPLICATE_REVIEW';
  registeredByEmployeeId?: string;
  registrationReference?: string;
  googleMapsUrl?: string;
  geocodedAddress?: string;
  locality?: string;
  businessType?: string;
  duplicateCheckResults?: any;
  outstandingBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const RetailerSchema = new Schema<IRetailer>(
  {
    name: { type: String, required: true, trim: true, index: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    altPhone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true, index: true },
    state: { type: String, default: 'Karnataka' },
    area: { type: String, required: true, index: true },
    locality: { type: String, trim: true },
    businessType: { type: String, trim: true, default: 'Retailer' },
    pincode: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    geofenceRadiusMeters: { type: Number, default: 100 },
    googleMapsUrl: { type: String },
    geocodedAddress: { type: String },
    shopCategory: {
      type: String,
      enum: ['MOBILE_RETAIL', 'MULTI_BRAND_STORE', 'ELECTRONICS_SHOWROOM', 'ACCESSORIES_SHOP', 'DISTRIBUTOR', 'WHOLESALER', 'AUTHORIZED_DEALER', 'OTHER'],
      default: 'MOBILE_RETAIL',
    },
    gstin: { type: String, trim: true },
    dealerCode: { type: String, required: true, unique: true, index: true },
    assignedEmployeeId: { type: String, index: true },
    registeredByEmployeeId: { type: String, index: true },
    registrationReference: { type: String, index: true },
    creditLimit: { type: Number, default: 0 },
    paymentTerms: { type: String, default: 'Net 15 Days' },
    photoUrl: { type: String },
    ownerPhotoUrl: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING_VERIFICATION', 'REJECTED', 'DUPLICATE_REVIEW'],
      default: 'VERIFIED',
      index: true,
    },
    duplicateCheckResults: { type: Schema.Types.Mixed },
    outstandingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RetailerSchema.index({ phone: 1, name: 1 }, { unique: true });

// -------------------------------------------------------------
// 2. SHOP VISIT SCHEMA (Advanced Field Sales & Verification)
// -------------------------------------------------------------
export interface IShopVisit extends Document {
  visitId?: string;
  retailerId: mongoose.Types.ObjectId;
  employeeId: string;
  visitType?: 'existing_shop' | 'new_shop';
  shopRegistrationReference?: string;
  visitDate: string; // YYYY-MM-DD
  startTime?: Date;
  endTime?: Date;
  saleDateTime?: Date; // Exact sale date and time as requested
  distributorDetails?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  checkInTime: Date;
  checkOutTime?: Date;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  distanceFromShopMeters: number;
  isWithinGeofence: boolean;
  googleMapsUrl?: string;
  geocodedAddress?: string;
  locationVerificationStatus?: 'VERIFIED' | 'OUTSIDE_GEOFENCE' | 'POOR_ACCURACY' | 'FLAGGED_REVIEW';
  locationVerificationNotes?: string;
  shopFrontPhoto?: {
    fileId?: string;
    photoUrl: string;
    storageReference?: string;
    mimeType?: string;
    fileSize?: number;
    capturedAt?: Date;
    captureMethod?: 'LIVE_CAMERA' | 'UPLOAD_FALLBACK';
    verificationStatus?: 'VERIFIED' | 'FLAGGED';
  };
  shopInteractionPhoto?: {
    fileId?: string;
    photoUrl: string;
    storageReference?: string;
    mimeType?: string;
    fileSize?: number;
    capturedAt?: Date;
    captureMethod?: 'LIVE_CAMERA' | 'UPLOAD_FALLBACK';
    verificationStatus?: 'VERIFIED' | 'FLAGGED';
    interactionConsentGiven?: boolean;
    declinedReason?: string;
  };
  photos: {
    photoUrl: string;
    category: string;
    caption?: string;
    timestamp: Date;
  }[];
  salesLines?: {
    productId: mongoose.Types.ObjectId;
    variantId?: string;
    productNameSnapshot: string;
    skuSnapshot: string;
    brandSnapshot: string;
    quantity: number;
    standardPriceSnapshot: number;
    actualSellingPrice: number;
    priceType: 'STANDARD' | 'MANUAL';
    priceDifference: number;
    manualPriceReason?: string;
    priceApprovalStatus: 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    lineTotal: number;
  }[];
  totalProducts?: number;
  totalUnits?: number;
  standardValue?: number;
  actualSalesValue?: number;
  totalPriceDifference?: number;
  taxSummary?: {
    taxableAmount: number;
    cgst: number;
    sgst: number;
    totalTax: number;
    finalTotal: number;
  };
  visitRemarks?: string;
  visitPurpose: string;
  notes?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  visitStatus?: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'FLAGGED_REVIEW' | 'APPROVED';
  submissionStatus?: 'ONLINE' | 'SYNCED_FROM_OFFLINE';
  idempotencyKey?: string;
  confirmedAccurate?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShopVisitSchema = new Schema<IShopVisit>(
  {
    visitId: { type: String, unique: true, sparse: true, index: true },
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    visitType: { type: String, enum: ['existing_shop', 'new_shop'], default: 'existing_shop' },
    shopRegistrationReference: { type: String },
    visitDate: { type: String, required: true, index: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    saleDateTime: { type: Date, default: Date.now },
    distributorDetails: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: { type: Date },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracyMeters: { type: Number, default: 15 },
    distanceFromShopMeters: { type: Number, default: 0 },
    isWithinGeofence: { type: Boolean, default: true },
    googleMapsUrl: { type: String },
    geocodedAddress: { type: String },
    locationVerificationStatus: {
      type: String,
      enum: ['VERIFIED', 'OUTSIDE_GEOFENCE', 'POOR_ACCURACY', 'FLAGGED_REVIEW'],
      default: 'VERIFIED',
    },
    locationVerificationNotes: { type: String },
    shopFrontPhoto: {
      fileId: { type: String },
      photoUrl: { type: String },
      storageReference: { type: String },
      mimeType: { type: String, default: 'image/jpeg' },
      fileSize: { type: Number },
      capturedAt: { type: Date, default: Date.now },
      captureMethod: { type: String, enum: ['LIVE_CAMERA', 'UPLOAD_FALLBACK'], default: 'LIVE_CAMERA' },
      verificationStatus: { type: String, enum: ['VERIFIED', 'FLAGGED'], default: 'VERIFIED' },
    },
    shopInteractionPhoto: {
      fileId: { type: String },
      photoUrl: { type: String },
      storageReference: { type: String },
      mimeType: { type: String, default: 'image/jpeg' },
      fileSize: { type: Number },
      capturedAt: { type: Date, default: Date.now },
      captureMethod: { type: String, enum: ['LIVE_CAMERA', 'UPLOAD_FALLBACK'], default: 'LIVE_CAMERA' },
      verificationStatus: { type: String, enum: ['VERIFIED', 'FLAGGED'], default: 'VERIFIED' },
      interactionConsentGiven: { type: Boolean, default: true },
      declinedReason: { type: String },
    },
    photos: [
      {
        photoUrl: { type: String, required: true },
        category: { type: String, default: 'EXTERIOR' },
        caption: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    salesLines: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        variantId: { type: String },
        productNameSnapshot: { type: String, required: true },
        skuSnapshot: { type: String, required: true },
        brandSnapshot: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        standardPriceSnapshot: { type: Number, required: true },
        actualSellingPrice: { type: Number, required: true },
        priceType: { type: String, enum: ['STANDARD', 'MANUAL'], default: 'STANDARD' },
        priceDifference: { type: Number, default: 0 },
        manualPriceReason: { type: String },
        priceApprovalStatus: {
          type: String,
          enum: ['NOT_REQUIRED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
          default: 'NOT_REQUIRED',
        },
        lineTotal: { type: Number, required: true },
      },
    ],
    totalProducts: { type: Number, default: 0 },
    totalUnits: { type: Number, default: 0 },
    standardValue: { type: Number, default: 0 },
    actualSalesValue: { type: Number, default: 0 },
    totalPriceDifference: { type: Number, default: 0 },
    taxSummary: {
      taxableAmount: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 },
      finalTotal: { type: Number, default: 0 },
    },
    visitRemarks: { type: String },
    visitPurpose: { type: String, default: 'Sales & Stock Replenishment' },
    notes: { type: String },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'IN_PROGRESS' },
    visitStatus: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'VERIFIED', 'FLAGGED_REVIEW', 'APPROVED'],
      default: 'SUBMITTED',
      index: true,
    },
    submissionStatus: {
      type: String,
      enum: ['ONLINE', 'SYNCED_FROM_OFFLINE'],
      default: 'ONLINE',
    },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    confirmedAccurate: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 3. PRODUCT CATEGORY SCHEMA
// -------------------------------------------------------------
export interface IProductCategory extends Document {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

const ProductCategorySchema = new Schema<IProductCategory>(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 4. MOBILE PHONES, ACCESSORIES & ELECTRONICS PRODUCT SCHEMA
// -------------------------------------------------------------
export interface IProduct extends Document {
  name: string;
  brand: string;
  modelName: string;
  modelNumber?: string;
  sku: string;
  barcode?: string;
  category:
    | 'SMARTPHONES'
    | 'TABLETS'
    | 'SMARTWATCHES'
    | 'EARBUDS'
    | 'HEADPHONES'
    | 'CHARGERS'
    | 'POWERBANKS'
    | 'ACCESSORIES'
    | 'SPEAKERS'
    | 'LAPTOPS'
    | 'ELECTRONICS'
    | string;
  description?: string;
  photograph?: string;
  galleryImages?: string[];
  color?: string;
  availableColors?: string[];
  ram?: string;
  storage?: string;
  displaySpecs?: string;
  batterySpecs?: string;
  processor?: string;
  screenSize?: string;
  connectivity?: string;
  warrantyPeriodMonths: number;
  mrp: number;
  dealerPrice: number;
  retailSellingPrice: number;
  gstRatePercent: number;
  hsnCode: string;
  requiresImei: boolean;
  stockQuantity?: number;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  featured?: boolean;
  rating?: number;
  reviewCount?: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    modelName: { type: String, required: true, trim: true },
    modelNumber: { type: String, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    barcode: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      index: true,
    },
    description: { type: String },
    photograph: { type: String },
    galleryImages: [{ type: String }],
    color: { type: String },
    availableColors: [{ type: String }],
    ram: { type: String },
    storage: { type: String },
    displaySpecs: { type: String },
    batterySpecs: { type: String },
    processor: { type: String },
    screenSize: { type: String },
    connectivity: { type: String },
    warrantyPeriodMonths: { type: Number, default: 12 },
    mrp: { type: Number, required: true },
    dealerPrice: { type: Number, required: true },
    retailSellingPrice: { type: Number, required: true },
    gstRatePercent: { type: Number, default: 18 },
    hsnCode: { type: String, default: '85171200' }, // 85171200: Smartphones; 85044090: Chargers
    requiresImei: { type: Boolean, default: false },
    stockQuantity: { type: Number, default: 25 },
    stockStatus: { type: String, enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'], default: 'IN_STOCK' },
    featured: { type: Boolean, default: false },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 5. DEVICE SERIAL & IMEI MANAGEMENT SCHEMA
// -------------------------------------------------------------
export interface IDeviceSerial extends Document {
  productId: mongoose.Types.ObjectId;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  modelNumber?: string;
  color?: string;
  storageVariant?: string;
  warehouseId?: mongoose.Types.ObjectId;
  stockStatus: 'IN_STOCK' | 'ALLOCATED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'DEFECTIVE';
  retailerId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  deliveryId?: mongoose.Types.ObjectId;
  purchaseReference?: string;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSerialSchema = new Schema<IDeviceSerial>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    imei1: { type: String, unique: true, sparse: true, trim: true, uppercase: true, index: true },
    imei2: { type: String, sparse: true, trim: true, uppercase: true },
    serialNumber: { type: String, unique: true, sparse: true, trim: true, uppercase: true, index: true },
    modelNumber: { type: String },
    color: { type: String },
    storageVariant: { type: String },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', index: true },
    stockStatus: {
      type: String,
      enum: ['IN_STOCK', 'ALLOCATED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'DEFECTIVE'],
      default: 'IN_STOCK',
      index: true,
    },
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery' },
    purchaseReference: { type: String },
    warrantyStartDate: { type: Date },
    warrantyEndDate: { type: Date },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 6. SALES ORDER SCHEMA
// -------------------------------------------------------------
export interface ISalesOrder extends Document {
  orderNumber: string;
  retailerId: mongoose.Types.ObjectId;
  employeeId: string;
  shopVisitId?: mongoose.Types.ObjectId;
  orderDate: Date;
  items: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    brand: string;
    model: string;
    sku: string;
    color?: string;
    storage?: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxableAmount: number;
    gstRatePercent: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    remarks?: string;
  }[];
  totalLines: number;
  totalUnits: number;
  subtotal: number;
  discountAmount: number;
  taxableValue: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  finalOrderValue: number;
  paymentTerms: string;
  deliveryPreference: string;
  remarks?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'PARTIALLY_FULFILLED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    shopVisitId: { type: Schema.Types.ObjectId, ref: 'ShopVisit' },
    orderDate: { type: Date, default: Date.now },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        brand: { type: String, required: true },
        model: { type: String, required: true },
        sku: { type: String, required: true },
        color: { type: String },
        storage: { type: String },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        taxableAmount: { type: Number, required: true },
        gstRatePercent: { type: Number, default: 18 },
        cgstAmount: { type: Number, default: 0 },
        sgstAmount: { type: Number, default: 0 },
        igstAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        remarks: { type: String },
      },
    ],
    totalLines: { type: Number, required: true },
    totalUnits: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    taxableValue: { type: Number, required: true },
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    igstTotal: { type: Number, default: 0 },
    finalOrderValue: { type: Number, required: true },
    paymentTerms: { type: String, default: 'Credit' },
    deliveryPreference: { type: String, default: 'Standard Delivery' },
    remarks: { type: String },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'PARTIALLY_FULFILLED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED'],
      default: 'SUBMITTED',
      index: true,
    },
    approvedBy: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 7. PRODUCT DELIVERY SCHEMA
// -------------------------------------------------------------
export interface IDelivery extends Document {
  deliveryNumber: string;
  orderId?: mongoose.Types.ObjectId;
  retailerId: mongoose.Types.ObjectId;
  employeeId: string;
  warehouseId?: mongoose.Types.ObjectId;
  deliveredAt: Date;
  items: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    sku: string;
    orderedQuantity: number;
    deliveredQuantity: number;
    pendingQuantity: number;
    damagedQuantity: number;
    returnedQuantity: number;
    unitPrice: number;
    totalValue: number;
    assignedImeis: string[];
    assignedSerialNumbers: string[];
  }[];
  totalUnitsDelivered: number;
  totalDeliveryValue: number;
  photos: {
    photoUrl: string;
    category: 'DELIVERED_DEVICES' | 'SHOP_ACKNOWLEDGEMENT' | 'SHELF_STOCK' | 'RECEIPT';
    caption?: string;
    timestamp: Date;
  }[];
  shopAcknowledgement?: {
    signatureUrl?: string;
    receiverName: string;
    receiverPhone?: string;
  };
  deliveryNotes?: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'PARTIALLY_DELIVERED' | 'COMPLETED' | 'CANCELLED';
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    deliveryNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    deliveredAt: { type: Date, default: Date.now },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        sku: { type: String, required: true },
        orderedQuantity: { type: Number, default: 0 },
        deliveredQuantity: { type: Number, required: true },
        pendingQuantity: { type: Number, default: 0 },
        damagedQuantity: { type: Number, default: 0 },
        returnedQuantity: { type: Number, default: 0 },
        unitPrice: { type: Number, required: true },
        totalValue: { type: Number, required: true },
        assignedImeis: [{ type: String }],
        assignedSerialNumbers: [{ type: String }],
      },
    ],
    totalUnitsDelivered: { type: Number, required: true },
    totalDeliveryValue: { type: Number, required: true },
    photos: [
      {
        photoUrl: { type: String, required: true },
        category: { type: String, default: 'DELIVERED_DEVICES' },
        caption: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    shopAcknowledgement: {
      signatureUrl: { type: String },
      receiverName: { type: String },
      receiverPhone: { type: String },
    },
    deliveryNotes: { type: String },
    status: {
      type: String,
      enum: ['SUBMITTED', 'VERIFIED', 'REJECTED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELLED'],
      default: 'SUBMITTED',
      index: true,
    },
    verifiedBy: { type: String },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 8. SALES TAX INVOICE SCHEMA
// -------------------------------------------------------------
export interface IInvoice extends Document {
  invoiceNumber: string;
  orderId?: mongoose.Types.ObjectId;
  deliveryId?: mongoose.Types.ObjectId;
  retailerId: mongoose.Types.ObjectId;
  invoiceDate: Date;
  sellerDetails: {
    companyName: string;
    gstin: string;
    pan: string;
    address: string;
    state: string;
    stateCode: string;
  };
  retailerDetails: {
    shopName: string;
    ownerName: string;
    gstin?: string;
    address: string;
    state: string;
  };
  items: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;
    mrp: number;
    discountAmount: number;
    taxableAmount: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalAmount: number;
    imeiNumbers?: string[];
  }[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalInvoiceValue: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentTerms: string;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery' },
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', required: true, index: true },
    invoiceDate: { type: Date, default: Date.now },
    sellerDetails: {
      companyName: { type: String, default: 'Acme Mobile & Electronics Distribution Pvt Ltd' },
      gstin: { type: String, default: '29AAACA1234A1Z5' },
      pan: { type: String, default: 'AAACA1234A' },
      address: { type: String, default: 'Plot 45, Tech Zone Industrial Corridor, Bangalore - 560066' },
      state: { type: String, default: 'Karnataka' },
      stateCode: { type: String, default: '29' },
    },
    retailerDetails: {
      shopName: { type: String, required: true },
      ownerName: { type: String, required: true },
      gstin: { type: String },
      address: { type: String, required: true },
      state: { type: String, default: 'Karnataka' },
    },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        productName: { type: String, required: true },
        hsnCode: { type: String, default: '85171200' },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        mrp: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        taxableAmount: { type: Number, required: true },
        cgstRate: { type: Number, default: 9 },
        cgstAmount: { type: Number, default: 0 },
        sgstRate: { type: Number, default: 9 },
        sgstAmount: { type: Number, default: 0 },
        igstRate: { type: Number, default: 0 },
        igstAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        imeiNumbers: [{ type: String }],
      },
    ],
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    igstTotal: { type: Number, default: 0 },
    totalInvoiceValue: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, required: true },
    paymentTerms: { type: String, default: 'Net 15' },
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 9. PAYMENT COLLECTION SCHEMA
// -------------------------------------------------------------
export interface IPaymentCollection extends Document {
  receiptNumber: string;
  retailerId: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;
  employeeId: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'NEFT' | 'RTGS' | 'IMPS' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT';
  transactionReference?: string;
  collectionDate: string; // YYYY-MM-DD
  paymentProofUrl?: string;
  notes?: string;
  isVerified: boolean;
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentCollectionSchema = new Schema<IPaymentCollection>(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true },
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    employeeId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'],
      required: true,
      index: true,
    },
    transactionReference: { type: String },
    collectionDate: { type: String, required: true, index: true },
    paymentProofUrl: { type: String },
    notes: { type: String },
    isVerified: { type: Boolean, default: true },
    verifiedBy: { type: String },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 10. RETAILER LEDGER SCHEMA
// -------------------------------------------------------------
export interface IRetailerLedger extends Document {
  retailerId: mongoose.Types.ObjectId;
  transactionType: 'INVOICE_DEBIT' | 'PAYMENT_CREDIT' | 'RETURN_CREDIT' | 'OPENING_BALANCE';
  referenceId: string;
  date: Date;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  description: string;
  createdAt: Date;
}

const RetailerLedgerSchema = new Schema<IRetailerLedger>(
  {
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', required: true, index: true },
    transactionType: {
      type: String,
      enum: ['INVOICE_DEBIT', 'PAYMENT_CREDIT', 'RETURN_CREDIT', 'OPENING_BALANCE'],
      required: true,
    },
    referenceId: { type: String, required: true },
    date: { type: Date, default: Date.now },
    debitAmount: { type: Number, default: 0 },
    creditAmount: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 11. WAREHOUSE SCHEMA
// -------------------------------------------------------------
export interface IWarehouse extends Document {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, index: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: 'Karnataka' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 12. INVENTORY STOCK SCHEMA
// -------------------------------------------------------------
export interface IInventory extends Document {
  warehouseId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  onHandStock: number;
  allocatedStock: number;
  availableStock: number;
  minimumThreshold: number;
  reorderQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    onHandStock: { type: Number, default: 0 },
    allocatedStock: { type: Number, default: 0 },
    availableStock: { type: Number, default: 0 },
    minimumThreshold: { type: Number, default: 10 },
    reorderQuantity: { type: Number, default: 25 },
  },
  { timestamps: true }
);

InventorySchema.index({ warehouseId: 1, productId: 1 }, { unique: true });

// -------------------------------------------------------------
// 13. STOCK MOVEMENT LEDGER SCHEMA
// -------------------------------------------------------------
export interface IStockMovement extends Document {
  warehouseId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  movementType: 'PURCHASE_INWARD' | 'STOCK_TRANSFER' | 'ORDER_RESERVATION' | 'DISPATCH' | 'DELIVERY_OUT' | 'SALES_RETURN' | 'STOCK_ADJUSTMENT';
  quantity: number;
  balanceAfter: number;
  referenceId?: string;
  imeiList?: string[];
  performedBy?: string;
  notes?: string;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    movementType: {
      type: String,
      enum: ['PURCHASE_INWARD', 'STOCK_TRANSFER', 'ORDER_RESERVATION', 'DISPATCH', 'DELIVERY_OUT', 'SALES_RETURN', 'STOCK_ADJUSTMENT'],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceId: { type: String },
    imeiList: [{ type: String }],
    performedBy: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 14. SALES TARGET SCHEMA
// -------------------------------------------------------------
export interface ISalesTarget extends Document {
  employeeId: string;
  month: number;
  year: number;
  targetTurnover: number;
  targetUnits: number;
  targetVisits: number;
  achievedTurnover: number;
  achievedUnits: number;
  achievedVisits: number;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SalesTargetSchema = new Schema<ISalesTarget>(
  {
    employeeId: { type: String, required: true, index: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    targetTurnover: { type: Number, default: 500000 },
    targetUnits: { type: Number, default: 50 },
    targetVisits: { type: Number, default: 60 },
    achievedTurnover: { type: Number, default: 0 },
    achievedUnits: { type: Number, default: 0 },
    achievedVisits: { type: Number, default: 0 },
    status: { type: String, default: 'ACTIVE' },
    notes: { type: String },
  },
  { timestamps: true }
);

SalesTargetSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

// -------------------------------------------------------------
// 15. SALES REPRESENTATIVE PROFILE SCHEMA
// -------------------------------------------------------------
export interface ISalesRepresentative extends Document {
  employeeId: string;
  territory: string;
  assignedCity: string;
  assignedArea: string;
  reportingManagerId?: string;
  monthlySalesTarget: number;
  dailyVisitTarget: number;
  monthlyProductTarget: number;
  commissionRatePercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SalesRepresentativeSchema = new Schema<ISalesRepresentative>(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    territory: { type: String, default: 'Central Electronics Hub' },
    assignedCity: { type: String, default: 'Bangalore' },
    assignedArea: { type: String, default: 'SP Road & Brigade' },
    reportingManagerId: { type: String },
    monthlySalesTarget: { type: Number, default: 500000 },
    dailyVisitTarget: { type: Number, default: 10 },
    monthlyProductTarget: { type: Number, default: 50 },
    commissionRatePercent: { type: Number, default: 2.0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// 16. SALES AUDIT LOG SCHEMA
// -------------------------------------------------------------
export interface ISalesAuditLog extends Document {
  action: string;
  userId?: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const SalesAuditLogSchema = new Schema<ISalesAuditLog>(
  {
    action: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

// Safe compilation preventing Mongoose OverwriteModelError in Next.js hot-reloads
export const Retailer: Model<IRetailer> = mongoose.models.Retailer || mongoose.model<IRetailer>('Retailer', RetailerSchema);
export const ShopVisit: Model<IShopVisit> = mongoose.models.ShopVisit || mongoose.model<IShopVisit>('ShopVisit', ShopVisitSchema);
export const ProductCategory: Model<IProductCategory> = mongoose.models.ProductCategory || mongoose.model<IProductCategory>('ProductCategory', ProductCategorySchema);
export const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export const DeviceSerial: Model<IDeviceSerial> = mongoose.models.DeviceSerial || mongoose.model<IDeviceSerial>('DeviceSerial', DeviceSerialSchema);
export const SalesOrder: Model<ISalesOrder> = mongoose.models.SalesOrder || mongoose.model<ISalesOrder>('SalesOrder', SalesOrderSchema);
export const Delivery: Model<IDelivery> = mongoose.models.Delivery || mongoose.model<IDelivery>('Delivery', DeliverySchema);
export const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export const PaymentCollection: Model<IPaymentCollection> = mongoose.models.PaymentCollection || mongoose.model<IPaymentCollection>('PaymentCollection', PaymentCollectionSchema);
export const RetailerLedger: Model<IRetailerLedger> = mongoose.models.RetailerLedger || mongoose.model<IRetailerLedger>('RetailerLedger', RetailerLedgerSchema);
export const Warehouse: Model<IWarehouse> = mongoose.models.Warehouse || mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
export const Inventory: Model<IInventory> = mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', InventorySchema);
export const StockMovement: Model<IStockMovement> = mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
export const SalesTarget: Model<ISalesTarget> = mongoose.models.SalesTarget || mongoose.model<ISalesTarget>('SalesTarget', SalesTargetSchema);
export const SalesRepresentative: Model<ISalesRepresentative> = mongoose.models.SalesRepresentative || mongoose.model<ISalesRepresentative>('SalesRepresentative', SalesRepresentativeSchema);
export const SalesAuditLog: Model<ISalesAuditLog> = mongoose.models.SalesAuditLog || mongoose.model<ISalesAuditLog>('SalesAuditLog', SalesAuditLogSchema);

// -------------------------------------------------------------
// 17. PUBLIC RETAILER PARTNERSHIP INQUIRY SCHEMA
// -------------------------------------------------------------
export interface IRetailerInquiry extends Document {
  inquiryNumber: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  businessType: string;
  gstin?: string;
  interestedCategories: string[];
  message?: string;
  status: 'NEW' | 'CONTACTED' | 'APPROVED' | 'REJECTED';
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RetailerInquirySchema = new Schema<IRetailerInquiry>(
  {
    inquiryNumber: { type: String, required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    businessType: { type: String, required: true },
    gstin: { type: String, trim: true, uppercase: true },
    interestedCategories: [{ type: String }],
    message: { type: String },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'APPROVED', 'REJECTED'],
      default: 'NEW',
      index: true,
    },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

export const RetailerInquiry: Model<IRetailerInquiry> =
  mongoose.models.RetailerInquiry || mongoose.model<IRetailerInquiry>('RetailerInquiry', RetailerInquirySchema);

// -------------------------------------------------------------
// 18. PUBLIC CONTACT INQUIRY SCHEMA
// -------------------------------------------------------------
export interface IContactInquiry extends Document {
  inquiryNumber: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactInquirySchema = new Schema<IContactInquiry>(
  {
    inquiryNumber: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['NEW', 'IN_PROGRESS', 'RESOLVED'],
      default: 'NEW',
      index: true,
    },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

export const ContactInquiry: Model<IContactInquiry> =
  mongoose.models.ContactInquiry || mongoose.model<IContactInquiry>('ContactInquiry', ContactInquirySchema);

// -------------------------------------------------------------
// 19. WEBSITE CONTENT & COMPANY CMS SCHEMA
// -------------------------------------------------------------
export interface IWebsiteContent extends Document {
  slug: string;
  companyName: string;
  tagline: string;
  headline: string;
  subheadline: string;
  aboutSummary: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  workingHours: string;
  yearsInDistribution: number;
  activeRetailersCount: number;
  citiesCoveredCount: number;
  verifiedBrandsCount: number;
  showTrustMetrics: boolean;
  announcements: Array<{
    id: string;
    title: string;
    summary: string;
    date: string;
    category: string;
    badge?: string;
  }>;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebsiteContentSchema = new Schema<IWebsiteContent>(
  {
    slug: { type: String, default: 'default', unique: true },
    companyName: { type: String, default: 'Salman Enterprises Distribution Ltd.' },
    tagline: { type: String, default: 'Authorized Master Distributor for Leading Mobile & Electronics Brands' },
    headline: { type: String, default: 'Powering the Future of Mobile & Electronics Distribution.' },
    subheadline: {
      type: String,
      default:
        'Connecting leading technology brands with retailers through reliable distribution, genuine products and smarter business partnerships.',
    },
    aboutSummary: {
      type: String,
      default:
        'A technology-first B2B electronics distribution company providing authentic flagship smartphones, wearables, wireless audio, and fast charging gear to authorized retailers across the nation.',
    },
    phone: { type: String, default: '+91 (080) 4129-8800' },
    email: { type: String, default: 'distribution@apexelectronics.in' },
    address: { type: String, default: 'Nexus Technology Park, 4th Floor, Electronic City Phase 1' },
    city: { type: String, default: 'Bangalore' },
    state: { type: String, default: 'Karnataka' },
    pincode: { type: String, default: '560100' },
    workingHours: { type: String, default: 'Monday - Saturday: 9:00 AM - 7:00 PM IST' },
    yearsInDistribution: { type: Number, default: 12 },
    activeRetailersCount: { type: Number, default: 0 },
    citiesCoveredCount: { type: Number, default: 0 },
    verifiedBrandsCount: { type: Number, default: 8 },
    showTrustMetrics: { type: Boolean, default: true },
    announcements: [
      {
        id: { type: String },
        title: { type: String },
        summary: { type: String },
        date: { type: String },
        category: { type: String },
        badge: { type: String },
      },
    ],
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const WebsiteContent: Model<IWebsiteContent> =
  mongoose.models.WebsiteContent || mongoose.model<IWebsiteContent>('WebsiteContent', WebsiteContentSchema);

// -------------------------------------------------------------
// 15. B2B QUOTATION & BULK INQUIRY SCHEMA
// -------------------------------------------------------------
export interface IQuoteRequest extends Document {
  quoteNumber: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  retailerId?: mongoose.Types.ObjectId;
  items: Array<{
    productId?: mongoose.Types.ObjectId;
    productName: string;
    brand: string;
    modelName: string;
    variant?: string;
    quantity: number;
    targetPrice?: number;
  }>;
  preferredDeliveryLocation: string;
  city: string;
  state: string;
  pincode?: string;
  additionalMessage?: string;
  status: 'PENDING' | 'REVIEWED' | 'QUOTED' | 'CONVERTED' | 'REJECTED';
  quotedTotal?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteRequestSchema = new Schema<IQuoteRequest>(
  {
    quoteNumber: { type: String, required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', index: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        productName: { type: String, required: true },
        brand: { type: String, required: true },
        modelName: { type: String, required: true },
        variant: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        targetPrice: { type: Number },
      },
    ],
    preferredDeliveryLocation: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String },
    additionalMessage: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'REVIEWED', 'QUOTED', 'CONVERTED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    quotedTotal: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
);

export const QuoteRequest: Model<IQuoteRequest> =
  mongoose.models.QuoteRequest || mongoose.model<IQuoteRequest>('QuoteRequest', QuoteRequestSchema);

// -------------------------------------------------------------
// 16. BRAND PARTNER SCHEMA
// -------------------------------------------------------------
export interface IBrand extends Document {
  name: string;
  code: string;
  slug: string;
  logoUrl?: string;
  tier: 'MASTER_PARTNER' | 'AUTHORIZED_TIER_1' | 'REGIONAL_PARTNER' | 'OEM_DISTRIBUTOR';
  authorizedMarginPercent: number;
  activeModelsCount: number;
  isOfficialPartner: boolean;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl: { type: String },
    tier: {
      type: String,
      enum: ['MASTER_PARTNER', 'AUTHORIZED_TIER_1', 'REGIONAL_PARTNER', 'OEM_DISTRIBUTOR'],
      default: 'AUTHORIZED_TIER_1',
    },
    authorizedMarginPercent: { type: Number, default: 8.5 },
    activeModelsCount: { type: Number, default: 0 },
    isOfficialPartner: { type: Boolean, default: true },
    description: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Brand: Model<IBrand> = mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);

// -------------------------------------------------------------
// 17. FORMAL B2B QUOTATION SCHEMA
// -------------------------------------------------------------
export interface IQuotation extends Document {
  quotationNumber: string;
  retailerId: mongoose.Types.ObjectId;
  employeeId: string;
  validUntil: Date;
  items: Array<{
    productId: mongoose.Types.ObjectId;
    productName: string;
    brand: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxableAmount: number;
    gstRatePercent: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  finalQuotationValue: number;
  paymentTerms: string;
  deliveryTimeline: string;
  remarks?: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'CONVERTED' | 'EXPIRED' | 'REJECTED';
  convertedOrderId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationSchema = new Schema<IQuotation>(
  {
    quotationNumber: { type: String, required: true, unique: true, index: true },
    retailerId: { type: Schema.Types.ObjectId, ref: 'Retailer', required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    validUntil: { type: Date, required: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        brand: { type: String, required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        taxableAmount: { type: Number, required: true },
        gstRatePercent: { type: Number, default: 18 },
        cgstAmount: { type: Number, default: 0 },
        sgstAmount: { type: Number, default: 0 },
        igstAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    igstTotal: { type: Number, default: 0 },
    finalQuotationValue: { type: Number, required: true },
    paymentTerms: { type: String, default: 'Net 15 Days' },
    deliveryTimeline: { type: String, default: 'Within 2-3 Business Days' },
    remarks: { type: String },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'APPROVED', 'CONVERTED', 'EXPIRED', 'REJECTED'],
      default: 'SENT',
      index: true,
    },
    convertedOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
  },
  { timestamps: true }
);

export const Quotation: Model<IQuotation> =
  mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);

// -------------------------------------------------------------
// 18. PROMOTIONS & TRADE SCHEMES SCHEMA
// -------------------------------------------------------------
export interface IPromotion extends Document {
  code: string;
  title: string;
  description: string;
  category: string;
  discountType: 'PERCENTAGE' | 'FLAT_AMOUNT';
  discountValue: number;
  minOrderUnits: number;
  minOrderAmount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: 'ALL' },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT_AMOUNT'], default: 'PERCENTAGE' },
    discountValue: { type: Number, required: true },
    minOrderUnits: { type: Number, default: 10 },
    minOrderAmount: { type: Number, default: 50000 },
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Promotion: Model<IPromotion> =
  mongoose.models.Promotion || mongoose.model<IPromotion>('Promotion', PromotionSchema);

// -------------------------------------------------------------
// 19. DISTRIBUTION IN-APP NOTIFICATION SCHEMA
// -------------------------------------------------------------
export interface IDistributionNotification extends Document {
  recipientRole: string;
  title: string;
  message: string;
  type: 'ORDER' | 'STOCK' | 'DELIVERY' | 'FINANCE' | 'SYSTEM';
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const DistributionNotificationSchema = new Schema<IDistributionNotification>(
  {
    recipientRole: { type: String, default: 'ALL', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['ORDER', 'STOCK', 'DELIVERY', 'FINANCE', 'SYSTEM'],
      default: 'SYSTEM',
      index: true,
    },
    link: { type: String },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const DistributionNotification: Model<IDistributionNotification> =
  mongoose.models.DistributionNotification ||
  mongoose.model<IDistributionNotification>('DistributionNotification', DistributionNotificationSchema);

// -------------------------------------------------------------
// 20. DISTRIBUTION ENTERPRISE SETTINGS SCHEMA
// -------------------------------------------------------------
export interface IDistributionSetting extends Document {
  slug: string;
  companyName: string;
  brandName: string;
  gstin: string;
  pan: string;
  registeredAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  defaultWarehouseId?: mongoose.Types.ObjectId;
  invoicePrefix: string;
  quotationPrefix: string;
  deliveryPrefix: string;
  defaultCreditDays: number;
  orderApprovalLimit: number;
  supportEmail: string;
  supportPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

const DistributionSettingSchema = new Schema<IDistributionSetting>(
  {
    slug: { type: String, default: 'default', unique: true },
    companyName: { type: String, default: 'Salman Enterprises Distribution Ltd.' },
    brandName: { type: String, default: 'Salman Enterprises' },
    gstin: { type: String, default: '29AAACA1234A1Z5' },
    pan: { type: String, default: 'AAACA1234A' },
    registeredAddress: { type: String, default: 'Nexus Technology Park, 4th Floor, Electronic City Phase 1' },
    city: { type: String, default: 'Bangalore' },
    state: { type: String, default: 'Karnataka' },
    stateCode: { type: String, default: '29' },
    pincode: { type: String, default: '560100' },
    bankName: { type: String, default: 'HDFC Bank Ltd.' },
    bankAccountNumber: { type: String, default: '50200088991122' },
    bankIfsc: { type: String, default: 'HDFC0001234' },
    bankBranch: { type: String, default: 'Electronic City Corporate Branch' },
    defaultWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    invoicePrefix: { type: String, default: 'APX-INV-' },
    quotationPrefix: { type: String, default: 'APX-QTN-' },
    deliveryPrefix: { type: String, default: 'APX-DLV-' },
    defaultCreditDays: { type: Number, default: 15 },
    orderApprovalLimit: { type: Number, default: 500000 },
    supportEmail: { type: String, default: 'distribution@apexelectronics.in' },
    supportPhone: { type: String, default: '+91 (080) 4129-8800' },
  },
  { timestamps: true }
);

export const DistributionSetting: Model<IDistributionSetting> =
  mongoose.models.DistributionSetting ||
  mongoose.model<IDistributionSetting>('DistributionSetting', DistributionSettingSchema);

// -------------------------------------------------------------
// 27. PRICE OVERRIDE APPROVAL QUEUE SCHEMA
// -------------------------------------------------------------
export interface IPriceOverride extends Document {
  overrideId: string;
  visitId?: string;
  shopId?: mongoose.Types.ObjectId;
  shopNameSnapshot?: string;
  productId: mongoose.Types.ObjectId;
  productNameSnapshot: string;
  skuSnapshot: string;
  standardPrice: number;
  requestedPrice: number;
  difference: number;
  quantity: number;
  reason: string;
  employeeId: string;
  employeeNameSnapshot?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvalRemarks?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PriceOverrideSchema = new Schema<IPriceOverride>(
  {
    overrideId: { type: String, required: true, unique: true, index: true },
    visitId: { type: String, index: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Retailer' },
    shopNameSnapshot: { type: String },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productNameSnapshot: { type: String, required: true },
    skuSnapshot: { type: String, required: true },
    standardPrice: { type: Number, required: true },
    requestedPrice: { type: Number, required: true },
    difference: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    reason: { type: String, required: true },
    employeeId: { type: String, required: true, index: true },
    employeeNameSnapshot: { type: String },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    approvedBy: { type: String },
    approvalRemarks: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const PriceOverride: Model<IPriceOverride> =
  mongoose.models.PriceOverride ||
  mongoose.model<IPriceOverride>('PriceOverride', PriceOverrideSchema);

// -------------------------------------------------------------
// 28. SHOP ONBOARDING APPLICATION SCHEMA
// -------------------------------------------------------------
export interface IShopApplication extends Document {
  applicationId: string;
  shopDetails: {
    name: string;
    ownerName: string;
    phone: string;
    altPhone?: string;
    email?: string;
    address: string;
    locality?: string;
    city: string;
    state: string;
    pincode: string;
    gstin?: string;
    shopCategory: string;
    businessType?: string;
    latitude: number;
    longitude: number;
    googleMapsUrl?: string;
    remarks?: string;
  };
  submittedByEmployeeId: string;
  submittedByEmployeeName?: string;
  visitId?: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DUPLICATE_REVIEW';
  duplicateCheckResults?: any;
  createdRetailerId?: mongoose.Types.ObjectId;
  reviewedBy?: string;
  reviewRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShopApplicationSchema = new Schema<IShopApplication>(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    shopDetails: {
      name: { type: String, required: true, trim: true },
      ownerName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      altPhone: { type: String, trim: true },
      email: { type: String, trim: true },
      address: { type: String, required: true },
      locality: { type: String, trim: true },
      city: { type: String, required: true },
      state: { type: String, default: 'Karnataka' },
      pincode: { type: String, required: true },
      gstin: { type: String, trim: true },
      shopCategory: { type: String, default: 'MOBILE_RETAIL' },
      businessType: { type: String, default: 'Retailer' },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      googleMapsUrl: { type: String },
      remarks: { type: String },
    },
    submittedByEmployeeId: { type: String, required: true, index: true },
    submittedByEmployeeName: { type: String },
    visitId: { type: String, index: true },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE_REVIEW'],
      default: 'PENDING',
      index: true,
    },
    duplicateCheckResults: { type: Schema.Types.Mixed },
    createdRetailerId: { type: Schema.Types.ObjectId, ref: 'Retailer' },
    reviewedBy: { type: String },
    reviewRemarks: { type: String },
  },
  { timestamps: true }
);

export const ShopApplication: Model<IShopApplication> =
  mongoose.models.ShopApplication ||
  mongoose.model<IShopApplication>('ShopApplication', ShopApplicationSchema);
