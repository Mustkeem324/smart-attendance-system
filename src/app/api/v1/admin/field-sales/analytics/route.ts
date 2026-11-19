import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import {
  ShopVisit,
  Retailer,
  Product,
  PriceOverride,
  ShopApplication,
} from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Total Field Employees from PostgreSQL
    const totalFieldEmployees = await prisma.employee.count({
      where: { employmentStatus: 'ACTIVE' },
    });

    // Visits metrics
    const [allVisits, allRetailers, priceOverrides, shopApplications] = await Promise.all([
      ShopVisit.find({})
        .populate('retailerId', 'name ownerName phone address city area dealerCode latitude longitude')
        .sort({ createdAt: -1 })
        .lean(),
      Retailer.find({ status: 'ACTIVE' }).lean(),
      PriceOverride.find({}).sort({ createdAt: -1 }).lean(),
      ShopApplication.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    const todayVisits = allVisits.filter((v: any) => v.visitDate === today);
    const completedVisits = todayVisits.filter((v: any) => v.status === 'COMPLETED' || v.visitStatus === 'SUBMITTED');
    const pendingVisits = todayVisits.length - completedVisits.length;

    let totalUnitsSold = 0;
    let totalFieldSalesRevenue = 0;
    let totalStandardValue = 0;
    let manualPriceAdjustments = 0;

    const brandSalesMap: Record<string, { brand: string; units: number; amount: number }> = {};
    const productSalesMap: Record<string, { name: string; sku: string; units: number; amount: number }> = {};
    const employeeSalesMap: Record<string, { employeeId: string; name: string; visits: number; units: number; amount: number }> = {};
    const shopSalesMap: Record<string, { shopName: string; city: string; visits: number; amount: number }> = {};

    for (const v of allVisits) {
      const empKey = v.employeeId || 'Unknown';
      if (!employeeSalesMap[empKey]) {
        employeeSalesMap[empKey] = { employeeId: empKey, name: 'Sales Representative', visits: 0, units: 0, amount: 0 };
      }
      employeeSalesMap[empKey].visits++;

      const shopName = (v.retailerId as any)?.name || 'Retailer';
      const shopCity = (v.retailerId as any)?.city || 'Karnataka';
      if (!shopSalesMap[shopName]) {
        shopSalesMap[shopName] = { shopName, city: shopCity, visits: 0, amount: 0 };
      }
      shopSalesMap[shopName].visits++;

      if (v.salesLines && v.salesLines.length > 0) {
        for (const line of v.salesLines) {
          const qty = line.quantity || 0;
          const amt = line.lineTotal || 0;
          const std = (line.standardPriceSnapshot || 0) * qty;

          totalUnitsSold += qty;
          totalFieldSalesRevenue += amt;
          totalStandardValue += std;
          if (line.priceType === 'MANUAL') {
            manualPriceAdjustments += Math.abs(amt - std);
          }

          employeeSalesMap[empKey].units += qty;
          employeeSalesMap[empKey].amount += amt;
          shopSalesMap[shopName].amount += amt;

          const brand = line.brandSnapshot || 'Other';
          if (!brandSalesMap[brand]) brandSalesMap[brand] = { brand, units: 0, amount: 0 };
          brandSalesMap[brand].units += qty;
          brandSalesMap[brand].amount += amt;

          const pName = line.productNameSnapshot || 'Product';
          if (!productSalesMap[pName]) productSalesMap[pName] = { name: pName, sku: line.skuSnapshot, units: 0, amount: 0 };
          productSalesMap[pName].units += qty;
          productSalesMap[pName].amount += amt;
        }
      }
    }

    // Pending approvals count
    const pendingPriceOverrides = priceOverrides.filter((p: any) => p.approvalStatus === 'PENDING');
    const pendingShopApplications = shopApplications.filter((s: any) => s.verificationStatus === 'PENDING' || s.verificationStatus === 'DUPLICATE_REVIEW');

    // Interactive Map Markers from submitted visits
    const mapMarkers = allVisits
      .filter((v: any) => v.latitude && v.longitude)
      .slice(0, 50)
      .map((v: any) => ({
        visitId: v.visitId || v._id,
        shopName: v.retailerId?.name || 'Shop Location',
        address: v.retailerId?.address || v.geocodedAddress || '',
        city: v.retailerId?.city || 'Bangalore',
        latitude: v.latitude,
        longitude: v.longitude,
        googleMapsUrl: v.googleMapsUrl || `https://www.google.com/maps?q=${v.latitude},${v.longitude}`,
        visitDate: v.visitDate,
        salesValue: v.actualSalesValue || 0,
        unitsSold: v.totalUnits || 0,
        locationVerificationStatus: v.locationVerificationStatus || 'VERIFIED',
        hasPhotos: Boolean(v.shopFrontPhoto?.photoUrl),
        photoUrl: v.shopFrontPhoto?.photoUrl || v.photos?.[0]?.photoUrl,
      }));

    return apiSuccess({
      kpis: {
        totalFieldEmployees,
        todayVisitsCount: todayVisits.length,
        completedVisitsCount: completedVisits.length,
        pendingVisitsCount: pendingVisits,
        newShopsRegisteredCount: shopApplications.length,
        totalUnitsSold,
        totalFieldSalesRevenue,
        totalStandardValue,
        manualPriceAdjustments,
        pendingApprovalsCount: pendingPriceOverrides.length + pendingShopApplications.length,
        pendingPriceOverridesCount: pendingPriceOverrides.length,
        pendingShopApplicationsCount: pendingShopApplications.length,
      },
      analytics: {
        brandSales: Object.values(brandSalesMap).sort((a, b) => b.amount - a.amount),
        productSales: Object.values(productSalesMap).sort((a, b) => b.amount - a.amount).slice(0, 10),
        employeeSales: Object.values(employeeSalesMap).sort((a, b) => b.amount - a.amount),
        topShops: Object.values(shopSalesMap).sort((a, b) => b.amount - a.amount).slice(0, 10),
      },
      mapMarkers,
      recentPendingOverrides: pendingPriceOverrides.slice(0, 5),
      recentPendingApplications: pendingShopApplications.slice(0, 5),
    });
  } catch (err: any) {
    console.error('Admin Field Sales Analytics GET Error:', err);
    return apiError(err.message || 'Failed to fetch admin field sales analytics', 500);
  }
}
