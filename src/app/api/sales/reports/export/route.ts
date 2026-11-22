export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const where: any = { organizationId: session.user.organizationId };
    if (status) where.status = status;
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(`${startDate}T00:00:00Z`),
        lte: new Date(`${endDate}T23:59:59Z`),
      };
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        shop: true,
        employee: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Attendance & Field Sales HRMS';

    // Sheet 1: Delivery Register
    const delSheet = workbook.addWorksheet('Deliveries');
    delSheet.views = [{ showGridLines: true }];

    delSheet.addRow([
      'Delivery Number',
      'Date & Time',
      'Shop Name',
      'Owner',
      'Address',
      'City / Area',
      'Sales Rep',
      'Status',
      'Product Lines',
      'Total Qty',
      'Subtotal (₹)',
      'Discount (₹)',
      'Tax (₹)',
      'Final Value (₹)',
    ]);

    delSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    delSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF11152F' } }; // Navy

    deliveries.forEach((d) => {
      delSheet.addRow([
        d.deliveryNumber,
        d.createdAt.toISOString().replace('T', ' ').slice(0, 19),
        d.shop.name,
        d.shop.ownerName,
        d.shop.address,
        `${d.shop.city} - ${d.shop.area}`,
        `${d.employee.firstName} ${d.employee.lastName}`,
        d.status,
        d.totalLines,
        d.totalQuantity,
        d.subtotal,
        d.discountAmount,
        d.taxAmount,
        d.finalDeliveryValue,
      ]);
    });

    delSheet.columns = [
      { width: 22 },
      { width: 20 },
      { width: 25 },
      { width: 18 },
      { width: 28 },
      { width: 20 },
      { width: 20 },
      { width: 16 },
      { width: 14 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 16 },
    ];

    // Sheet 2: Itemized Product Deliveries
    const itemSheet = workbook.addWorksheet('Itemized Products');
    itemSheet.addRow([
      'Delivery Number',
      'Shop Name',
      'Product Name',
      'SKU',
      'Unit',
      'Delivered Qty',
      'Unit Price (₹)',
      'Tax (₹)',
      'Total Price (₹)',
      'Remarks',
    ]);
    itemSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    itemSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5428E8' } }; // Deep Indigo

    deliveries.forEach((d) => {
      d.items.forEach((item) => {
        itemSheet.addRow([
          d.deliveryNumber,
          d.shop.name,
          item.product.name,
          item.product.sku,
          item.unitOfMeasure,
          item.quantity,
          item.unitPrice,
          item.taxAmount,
          item.totalPrice,
          item.remarks || '',
        ]);
      });
    });

    itemSheet.columns = [
      { width: 22 },
      { width: 25 },
      { width: 26 },
      { width: 16 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 16 },
      { width: 20 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(Buffer.from(buffer) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Field_Sales_Deliveries_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
