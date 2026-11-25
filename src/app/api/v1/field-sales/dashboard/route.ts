export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import {
  ShopVisit,
  Retailer,
  Product,
  PriceOverride,
  SalesOrder,
} from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Fetch employee details from PostgreSQL
    let employeeData: any = null;
    let employeeId = user.id;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { employee: true },
    });

    if (dbUser?.employee) {
      employeeData = dbUser.employee;
      employeeId = dbUser.employee.id;
    }

    // Today's visits by this employee
    const todayVisits = await ShopVisit.find({
      employeeId: { $in: [user.id, employeeId] },
      visitDate: today,
    })
      .populate('retailerId', 'name ownerName phone address city area dealerCode latitude longitude')
      .sort({ createdAt: -1 })
      .lean();

    const completedVisits = todayVisits.filter((v: any) => v.visitStatus === 'SUBMITTED' || v.status === 'COMPLETED');
    const shopsVisitedCount = new Set(todayVisits.map((v: any) => String(v.retailerId?._id || v.retailerId))).size;

    // Compute products sold, units sold, sales amount for today
    let productsSoldCount = 0;
    let totalUnitsSold = 0;
    let todaySalesAmount = 0;
    let pendingApprovalsCount = 0;

    for (const v of todayVisits) {
      if (v.salesLines && v.salesLines.length > 0) {
        productsSoldCount += v.salesLines.length;
        for (const line of v.salesLines) {
          totalUnitsSold += line.quantity || 0;
          todaySalesAmount += line.lineTotal || 0;
          if (line.priceApprovalStatus === 'PENDING_APPROVAL') {
            pendingApprovalsCount++;
          }
        }
      }
    }

    // Monthly Target & Achievement
    const currentMonthPrefix = today.slice(0, 7);
    const monthlyVisits = await ShopVisit.find({
      employeeId: { $in: [user.id, employeeId] },
      visitDate: { $regex: `^${currentMonthPrefix}` },
      visitStatus: { $in: ['SUBMITTED', 'VERIFIED', 'APPROVED'] },
    }).lean();

    let monthlySalesTotal = 0;
    for (const v of monthlyVisits) {
      if (v.actualSalesValue) {
        monthlySalesTotal += v.actualSalesValue;
      } else if (v.salesLines) {
        for (const l of v.salesLines) {
          monthlySalesTotal += l.lineTotal || 0;
        }
      }
    }

    const monthlyTarget = 1500000; // ₹15 Lakhs standard monthly rep target
    const targetAchievementPercent = Math.min(100, parseFloat(((monthlySalesTotal / monthlyTarget) * 100).toFixed(1)));

    // Assigned shops for today's visit plan
    const assignedShops = await Retailer.find({
      $or: [
        { assignedEmployeeId: employeeId },
        { assignedEmployeeId: user.id },
        { status: 'ACTIVE' },
      ],
    })
      .limit(10)
      .lean();

    const visitPlan = assignedShops.map((shop: any, idx: number) => {
      const visitedToday = todayVisits.find((v: any) => String(v.retailerId?._id || v.retailerId) === String(shop._id));
      return {
        shopId: shop._id,
        shopCode: shop.dealerCode,
        shopName: shop.name,
        ownerName: shop.ownerName,
        phone: shop.phone,
        address: shop.address,
        area: shop.area,
        city: shop.city,
        latitude: shop.latitude,
        longitude: shop.longitude,
        plannedTime: `1${idx}:00 AM`,
        visitStatus: visitedToday ? 'VISITED' : 'SCHEDULED',
        visitId: visitedToday?.visitId,
      };
    });

    // Recent 7-Day sales chart
    const dailyTrend: { date: string; amount: number; visits: number; units: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().split('T')[0];
      const dayVisits = monthlyVisits.filter((v: any) => v.visitDate === d);
      let dayAmount = 0;
      let dayUnits = 0;
      for (const v of dayVisits) {
        if (v.actualSalesValue) dayAmount += v.actualSalesValue;
        if (v.salesLines) {
          for (const l of v.salesLines) dayUnits += l.quantity || 0;
        }
      }
      dailyTrend.push({
        date: d.slice(5),
        amount: dayAmount,
        visits: dayVisits.length,
        units: dayUnits,
      });
    }

    // Recent Activity Feed
    const recentVisits = await ShopVisit.find({
      employeeId: { $in: [user.id, employeeId] },
    })
      .populate('retailerId', 'name area city phone dealerCode')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return apiSuccess({
      employee: {
        id: employeeId,
        userId: user.id,
        name: employeeData?.firstName ? `${employeeData.firstName} ${employeeData.lastName}` : (user.name || user.email?.split('@')[0] || 'Sales Representative'),
        employeeCode: employeeData?.employeeCode || 'FIELD-REP',
        email: user.email,
        phone: employeeData?.phone || '',
        territory: 'Regional Sales Territory',
        designation: employeeData?.designation || 'Field Sales Representative',
        department: 'Field Sales & Distribution',
        photoUrl: employeeData?.profilePhoto || employeeData?.photoUrl || '',
        attendanceStatus: 'CHECKED_IN',
      },
      kpis: {
        todayVisitsCount: todayVisits.length,
        shopsVisitedCount,
        completedVisitsCount: completedVisits.length,
        productsSoldCount,
        totalUnitsSold,
        todaySalesAmount,
        pendingSubmissions: 0,
        pendingApprovalsCount,
        monthlyTarget,
        monthlySalesTotal,
        targetAchievementPercent,
      },
      visitPlan,
      dailyTrend,
      recentVisits,
    });
  } catch (err: any) {
    console.error('Field Sales Dashboard GET Error:', err);
    return apiError(err.message || 'Failed to fetch field sales dashboard', 500);
  }
}
