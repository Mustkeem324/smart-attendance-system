export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Invoice, SalesOrder, Product, Inventory, Retailer, PaymentCollection } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'sales';
    const exportFormat = searchParams.get('export'); // 'csv' or null

    if (type === 'sales') {
      const orders = await SalesOrder.find()
        .populate('retailerId', 'name city state dealerCode')
        .sort({ orderDate: -1 })
        .lean();

      if (exportFormat === 'csv') {
        const rows = ['OrderNumber,Date,Retailer,DealerCode,City,Units,TaxableValue,GST,TotalValue,Status'];
        orders.forEach((o: any) => {
          rows.push(
            `"${o.orderNumber}","${new Date(o.orderDate).toISOString().split('T')[0]}","${o.retailerId?.name || ''}","${o.retailerId?.dealerCode || ''}","${o.retailerId?.city || ''}",${o.totalUnits},${o.taxableValue},${(o.cgstTotal || 0) + (o.sgstTotal || 0) + (o.igstTotal || 0)},${o.finalOrderValue},"${o.status}"`
          );
        });
        return new NextResponse(rows.join('\n'), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="sales_report.csv"',
          },
        });
      }

      const totalRevenue = orders.reduce((sum, o) => sum + (o.finalOrderValue || 0), 0);
      const totalUnits = orders.reduce((sum, o) => sum + (o.totalUnits || 0), 0);

      return apiSuccess({
        type: 'sales',
        summary: { totalOrders: orders.length, totalRevenue, totalUnits },
        records: orders,
      });
    }

    if (type === 'inventory') {
      const inventories = await Inventory.find()
        .populate('warehouseId', 'name code city')
        .populate('productId', 'name brand sku category mrp dealerPrice')
        .lean();

      if (exportFormat === 'csv') {
        const rows = ['Warehouse,Product,Brand,SKU,Category,OnHandStock,AvailableStock,DealerPrice,Valuation'];
        inventories.forEach((inv: any) => {
          const val = (inv.availableStock || 0) * (inv.productId?.dealerPrice || 0);
          rows.push(
            `"${inv.warehouseId?.name || ''}","${inv.productId?.name || ''}","${inv.productId?.brand || ''}","${inv.productId?.sku || ''}","${inv.productId?.category || ''}",${inv.onHandStock},${inv.availableStock},${inv.productId?.dealerPrice || 0},${val}`
          );
        });
        return new NextResponse(rows.join('\n'), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="inventory_valuation.csv"',
          },
        });
      }

      let totalUnits = 0;
      let totalValuation = 0;
      inventories.forEach((inv: any) => {
        const u = inv.availableStock || 0;
        totalUnits += u;
        totalValuation += u * (inv.productId?.dealerPrice || 0);
      });

      return apiSuccess({
        type: 'inventory',
        summary: { totalItems: inventories.length, totalUnits, totalValuation },
        records: inventories,
      });
    }

    if (type === 'receivables') {
      const retailers = await Retailer.find().sort({ outstandingBalance: -1 }).lean();

      if (exportFormat === 'csv') {
        const rows = ['DealerCode,RetailerName,Owner,Phone,City,CreditLimit,OutstandingBalance,Status'];
        retailers.forEach((r: any) => {
          rows.push(
            `"${r.dealerCode}","${r.name}","${r.ownerName}","${r.phone}","${r.city}",${r.creditLimit},${r.outstandingBalance},"${r.status}"`
          );
        });
        return new NextResponse(rows.join('\n'), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="receivables_report.csv"',
          },
        });
      }

      const totalReceivables = retailers.reduce((sum, r) => sum + (r.outstandingBalance || 0), 0);
      const totalCreditExtended = retailers.reduce((sum, r) => sum + (r.creditLimit || 0), 0);

      return apiSuccess({
        type: 'receivables',
        summary: { totalRetailers: retailers.length, totalReceivables, totalCreditExtended },
        records: retailers,
      });
    }

    if (type === 'gst') {
      const invoices = await Invoice.find().sort({ invoiceDate: -1 }).lean();

      if (exportFormat === 'csv') {
        const rows = ['InvoiceNumber,Date,Customer,GSTIN,TaxableValue,CGST,SGST,IGST,TotalInvoiceValue'];
        invoices.forEach((inv: any) => {
          rows.push(
            `"${inv.invoiceNumber}","${new Date(inv.invoiceDate).toISOString().split('T')[0]}","${inv.retailerDetails?.shopName || ''}","${inv.retailerDetails?.gstin || ''}",${inv.taxableAmount},${inv.cgstTotal},${inv.sgstTotal},${inv.igstTotal},${inv.totalInvoiceValue}`
          );
        });
        return new NextResponse(rows.join('\n'), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="gst_gstr1_b2b.csv"',
          },
        });
      }

      const totalTaxable = invoices.reduce((sum, inv) => sum + (inv.taxableAmount || 0), 0);
      const totalCgst = invoices.reduce((sum, inv) => sum + (inv.cgstTotal || 0), 0);
      const totalSgst = invoices.reduce((sum, inv) => sum + (inv.sgstTotal || 0), 0);
      const totalIgst = invoices.reduce((sum, inv) => sum + (inv.igstTotal || 0), 0);
      const totalGst = totalCgst + totalSgst + totalIgst;

      return apiSuccess({
        type: 'gst',
        summary: { totalInvoices: invoices.length, totalTaxable, totalCgst, totalSgst, totalIgst, totalGst },
        records: invoices,
      });
    }

    return apiError('Invalid report type. Supported: sales, inventory, receivables, gst', 400);
  } catch (err: any) {
    console.error('V1 Reports GET Error:', err);
    return apiError(err.message || 'Failed to generate report', 500);
  }
}
