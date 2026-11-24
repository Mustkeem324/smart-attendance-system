export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { WebsiteContent, Retailer, Product, ProductCategory } from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // Fetch or create default CMS content
    let content = await WebsiteContent.findOne({ slug: 'default' });
    if (!content) {
      content = await WebsiteContent.create({
        slug: 'default',
        companyName: 'Salman Enterprises Distribution Ltd.',
        tagline: 'Authorized Master Distributor for Leading Mobile & Electronics Brands',
        headline: 'Powering the Future of Mobile & Electronics Distribution.',
        subheadline:
          'Connecting leading technology brands with retailers through reliable distribution, genuine products and smarter business partnerships.',
        aboutSummary:
          'A technology-driven B2B electronics distribution platform providing authentic flagship smartphones, wearables, wireless audio, and fast charging gear to authorized retail networks across India.',
        phone: '+91 (080) 4129-8800',
        email: 'distribution@apexelectronics.in',
        address: 'Nexus Technology Park, 4th Floor, Electronic City Phase 1',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560100',
        workingHours: 'Monday - Saturday: 9:00 AM - 7:00 PM IST',
        yearsInDistribution: 12,
        verifiedBrandsCount: 8,
        showTrustMetrics: true,
        announcements: [
          {
            id: 'ann-01',
            title: 'New 2026 5G Flagship Device Shipments Now Live',
            summary:
              'Authorized retailers can now place allocations for the latest Snapdragon 8 Gen 3 and Dimensity 9300 flagship smartphones.',
            date: 'Nov 18, 2026',
            category: 'CATALOG LAUNCH',
            badge: 'NEW ARRIVAL',
          },
          {
            id: 'ann-02',
            title: 'Express Same-Day Warehouse Dispatch Enabled',
            summary:
              'Orders booked before 1:00 PM are now dispatched same-day with direct IMEI assignment and transit tracking.',
            date: 'Nov 15, 2026',
            category: 'LOGISTICS UPDATE',
            badge: 'NETWORK',
          },
        ],
      });
    }

    // Compute live stats from actual database
    const [realRetailerCount, realCities, activeProductsCount] = await Promise.all([
      Retailer.countDocuments({ status: 'ACTIVE' }),
      Retailer.distinct('city', { status: 'ACTIVE' }),
      Product.countDocuments({ status: 'ACTIVE' }),
    ]);

    const liveStats = {
      yearsInDistribution: content.yearsInDistribution || 12,
      retailerNetwork: Math.max(realRetailerCount, content.activeRetailersCount || 0),
      citiesCovered: Math.max(realCities.length, content.citiesCoveredCount || 0),
      activeProductsCount,
      verifiedBrandsCount: content.verifiedBrandsCount || 8,
      showTrustMetrics: content.showTrustMetrics && (realRetailerCount > 0 || content.yearsInDistribution > 0),
    };

    return NextResponse.json({
      success: true,
      content,
      liveStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
