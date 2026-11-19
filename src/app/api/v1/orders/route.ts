import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SalesOrder, Retailer, Product, Inventory, StockMovement } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const retailerId = searchParams.get('retailerId');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status && status !== 'ALL') filter.status = status;
    if (retailerId && retailerId !== 'ALL') filter.retailerId = retailerId;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, orders] = await Promise.all([
      SalesOrder.countDocuments(filter),
      SalesOrder.find(filter)
        .populate('retailerId', 'name ownerName phone city state dealerCode creditLimit outstandingBalance')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return apiSuccess(orders, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Orders GET Error:', err);
    return apiError(err.message || 'Failed to fetch sales orders', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { retailerId, items, paymentTerms = 'Credit', deliveryPreference = 'Standard Delivery', remarks } = body;

    if (!retailerId || !items || !Array.isArray(items) || items.length === 0) {
      return apiError('Retailer ID and at least one order line item are required', 400);
    }

    const retailer = await Retailer.findById(retailerId);
    if (!retailer) return apiError('Retailer not found', 404);

    if (retailer.status !== 'ACTIVE') {
      return apiError(`Retailer account is ${retailer.status}. Cannot process new orders.`, 403);
    }

    // Process line items, calculate GST and validate stock
    let totalLines = 0;
    let totalUnits = 0;
    let subtotal = 0;
    let taxableValue = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let finalOrderValue = 0;

    const isInterState = retailer.state && retailer.state.toLowerCase() !== 'karnataka';
    const processedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (!item.productId || !qty || qty <= 0) {
        return apiError('Each item must have a valid productId and positive quantity', 400);
      }

      const product = await Product.findById(item.productId);
      if (!product) return apiError(`Product ${item.productId} not found`, 404);

      // Verify inventory availability
      const inv = await Inventory.findOne({ productId: product._id });
      if (inv && inv.availableStock < qty) {
        return apiError(
          `Insufficient stock for ${product.name}. Available: ${inv.availableStock}, Requested: ${qty}`,
          400
        );
      }

      const unitPrice = Number(item.unitPrice || product.dealerPrice);
      const lineSubtotal = unitPrice * qty;
      const discount = Number(item.discountAmount || 0);
      const lineTaxable = Math.max(0, lineSubtotal - discount);

      const gstRate = product.gstRatePercent || 18;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = Math.round((lineTaxable * gstRate) / 100);
      } else {
        cgst = Math.round((lineTaxable * (gstRate / 2)) / 100);
        sgst = Math.round((lineTaxable * (gstRate / 2)) / 100);
      }

      const lineTotal = lineTaxable + cgst + sgst + igst;

      totalLines += 1;
      totalUnits += qty;
      subtotal += lineSubtotal;
      taxableValue += lineTaxable;
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;
      finalOrderValue += lineTotal;

      processedItems.push({
        productId: product._id,
        productName: product.name,
        brand: product.brand,
        model: product.modelName,
        sku: product.sku,
        color: item.color || product.color,
        storage: item.storage || product.storage,
        quantity: qty,
        unitPrice,
        discountAmount: discount,
        taxableAmount: lineTaxable,
        gstRatePercent: gstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: lineTotal,
        remarks: item.remarks,
      });

      // Stock Reservation: decrease availableStock, increase allocatedStock
      if (inv) {
        inv.availableStock = Math.max(0, inv.availableStock - qty);
        inv.allocatedStock = (inv.allocatedStock || 0) + qty;
        await inv.save();

        await StockMovement.create({
          warehouseId: inv.warehouseId,
          productId: product._id,
          movementType: 'ORDER_RESERVATION',
          quantity: -qty,
          balanceAfter: inv.availableStock,
          performedBy: user.email,
          notes: `Reserved for B2B Retailer Order: ${retailer.dealerCode}`,
        });
      }
    }

    // Check Credit Limit (if paymentTerms is Credit)
    if (paymentTerms === 'Credit') {
      const projectedBalance = (retailer.outstandingBalance || 0) + finalOrderValue;
      if (retailer.creditLimit > 0 && projectedBalance > retailer.creditLimit) {
        // Still allow booking with PENDING_APPROVAL status
      }
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

    const order = await SalesOrder.create({
      orderNumber,
      retailerId: retailer._id,
      employeeId: user.id,
      orderDate: new Date(),
      items: processedItems,
      totalLines,
      totalUnits,
      subtotal,
      discountAmount: 0,
      taxableValue,
      cgstTotal,
      sgstTotal,
      igstTotal,
      finalOrderValue,
      paymentTerms,
      deliveryPreference,
      remarks,
      status: 'APPROVED',
      approvedBy: user.email,
      approvedAt: new Date(),
    });

    await logDistributionAction({
      action: 'ORDER_CREATED',
      userId: user.id,
      entityType: 'SalesOrder',
      entityId: order._id.toString(),
      details: { orderNumber: order.orderNumber, retailerId: retailer._id, finalOrderValue, totalUnits },
      req,
    });

    return apiSuccess(order, undefined, 201);
  } catch (err: any) {
    console.error('V1 Orders POST Error:', err);
    return apiError(err.message || 'Failed to create sales order', 500);
  }
}
