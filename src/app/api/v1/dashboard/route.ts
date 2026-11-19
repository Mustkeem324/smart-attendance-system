import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  Retailer,
  SalesOrder,
  Delivery,
  Invoice,
  PaymentCollection,
  Product,
  Inventory,
  SalesAuditLog,
  RetailerInquiry,
} from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();

    // 1. Core KPIs
    const [
      activeRetailersCount,
      totalOrdersCount,
      pendingOrdersCount,
      salesOrders,
      invoices,
      payments,
      inventoryDocs,
      recentOrders,
      lowStockProducts,
      pendingInquiries,
      recentDeliveries,
      recentAuditLogs,
    ] = await Promise.all([
      Retailer.countDocuments({ status: 'ACTIVE' }),
      SalesOrder.countDocuments(),
      SalesOrder.countDocuments({ status: { $in: ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] } }),
      SalesOrder.find().select('finalOrderValue totalUnits createdAt items').lean(),
      Invoice.find().select('totalInvoiceValue amountPaid outstandingBalance createdAt isPaid').lean(),
      PaymentCollection.find().select('amount paymentMethod collectionDate createdAt').lean(),
      Inventory.find().populate('productId', 'name brand mrp dealerPrice').lean(),
      SalesOrder.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('retailerId', 'name city state dealerCode')
        .lean(),
      Product.find({ stockStatus: 'LOW_STOCK' })
        .limit(10)
        .select('name brand sku category stockQuantity mrp dealerPrice')
        .lean(),
      RetailerInquiry.find({ status: 'NEW' })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Delivery.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('retailerId', 'name city')
        .lean(),
      SalesAuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // Financial totals
    const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.totalInvoiceValue || 0), 0);
    const totalPaymentsCollected = payments.reduce((acc, pay) => acc + (pay.amount || 0), 0);
    const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.outstandingBalance || 0), 0);
    const totalUnitsSold = salesOrders.reduce((acc, ord) => acc + (ord.totalUnits || 0), 0);

    // Inventory Valuation
    let totalInventoryUnits = 0;
    let totalInventoryValuation = 0;
    inventoryDocs.forEach((inv: any) => {
      const units = inv.availableStock || 0;
      totalInventoryUnits += units;
      const price = inv.productId?.dealerPrice || 0;
      totalInventoryValuation += units * price;
    });

    // Monthly revenue trend (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap: Record<string, { revenue: number; collections: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyMap[key] = { revenue: 0, collections: 0 };
    }

    invoices.forEach((inv: any) => {
      const d = new Date(inv.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += inv.totalInvoiceValue || 0;
      }
    });

    payments.forEach((pay: any) => {
      const d = new Date(pay.collectionDate || pay.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlyMap[key]) {
        monthlyMap[key].collections += pay.amount || 0;
      }
    });

    const monthlyTrends = Object.keys(monthlyMap).map((m) => ({
      month: m,
      revenue: Math.round(monthlyMap[m].revenue),
      collections: Math.round(monthlyMap[m].collections),
    }));

    // Category Sales breakdown
    const categorySalesMap: Record<string, number> = {};
    salesOrders.forEach((so: any) => {
      if (Array.isArray(so.items)) {
        so.items.forEach((it: any) => {
          const cat = it.category || 'SMARTPHONES';
          categorySalesMap[cat] = (categorySalesMap[cat] || 0) + (it.totalAmount || 0);
        });
      }
    });

    const categoryDistribution = Object.keys(categorySalesMap).map((cat) => ({
      category: cat,
      sales: Math.round(categorySalesMap[cat]),
    }));

    // Brand Performance breakdown
    const brandSalesMap: Record<string, { units: number; amount: number }> = {};
    salesOrders.forEach((so: any) => {
      if (Array.isArray(so.items)) {
        so.items.forEach((it: any) => {
          const brand = it.brand || 'Other';
          if (!brandSalesMap[brand]) brandSalesMap[brand] = { units: 0, amount: 0 };
          brandSalesMap[brand].units += it.quantity || 1;
          brandSalesMap[brand].amount += it.totalAmount || 0;
        });
      }
    });

    const brandPerformance = Object.keys(brandSalesMap).map((brand) => ({
      brand,
      units: brandSalesMap[brand].units,
      amount: Math.round(brandSalesMap[brand].amount),
    }));

    return apiSuccess({
      kpis: {
        activeRetailers: {
          value: activeRetailersCount,
          changePercent: 12.5,
          trend: 'up',
          subtext: 'Across 4 urban distribution clusters',
        },
        totalOrders: {
          value: totalOrdersCount,
          changePercent: 8.2,
          trend: 'up',
          subtext: `${pendingOrdersCount} orders currently in processing`,
        },
        unitsSold: {
          value: totalUnitsSold,
          changePercent: 15.0,
          trend: 'up',
          subtext: 'Smartphones, wearables & audio units',
        },
        salesRevenue: {
          value: totalRevenue,
          changePercent: 14.8,
          trend: 'up',
          subtext: 'Total GST invoiced wholesale turnover',
        },
        paymentsCollected: {
          value: totalPaymentsCollected,
          changePercent: 11.2,
          trend: 'up',
          subtext: 'UPI, NEFT & Bank Realizations',
        },
        outstandingReceivables: {
          value: totalOutstanding,
          changePercent: -4.3,
          trend: 'down',
          subtext: 'Dealer credit under 15-day SLA',
        },
        pendingFulfillment: {
          value: pendingOrdersCount,
          changePercent: 0,
          trend: 'neutral',
          subtext: 'Awaiting warehouse IMEI dispatch',
        },
        inventoryValuation: {
          value: totalInventoryValuation,
          units: totalInventoryUnits,
          changePercent: 5.6,
          trend: 'up',
          subtext: 'Across Central Distribution Hubs',
        },
      },
      charts: {
        monthlyTrends,
        categoryDistribution,
        brandPerformance,
      },
      tables: {
        recentOrders,
        lowStockProducts,
        pendingInquiries,
        recentDeliveries,
        recentAuditLogs,
      },
    });
  } catch (err: any) {
    console.error('V1 Dashboard GET Error:', err);
    return apiError(err.message || 'Failed to generate dashboard analytics', 500);
  }
}
