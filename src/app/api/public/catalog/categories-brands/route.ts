export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Product } from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // Defined 12 core product categories
    const ALL_CATEGORIES = [
      { id: 'SMARTPHONES', title: 'Smartphones', iconName: 'Smartphone' },
      { id: 'TABLETS', title: 'Tablets', iconName: 'Tablet' },
      { id: 'SMARTWATCHES', title: 'Smartwatches', iconName: 'Watch' },
      { id: 'EARBUDS', title: 'Wireless Earbuds', iconName: 'Headphones' },
      { id: 'HEADPHONES', title: 'Headphones', iconName: 'Headphones' },
      { id: 'CHARGERS', title: 'Chargers', iconName: 'Zap' },
      { id: 'POWERBANKS', title: 'Power Banks', iconName: 'BatteryCharging' },
      { id: 'ACCESSORIES', title: 'Mobile Accessories', iconName: 'Boxes' },
      { id: 'SPEAKERS', title: 'Speakers', iconName: 'Volume2' },
      { id: 'LAPTOPS', title: 'Laptops', iconName: 'Laptop' },
      { id: 'ELECTRONICS', title: 'Electronics', iconName: 'Tv' },
    ];

    // Aggregate category counts
    const categoryCountsRaw = await Product.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const categoryCountsMap: Record<string, number> = {};
    categoryCountsRaw.forEach((c) => {
      if (c._id) categoryCountsMap[c._id.toString().toUpperCase()] = c.count;
    });

    const totalProductsCount = await Product.countDocuments({ status: 'ACTIVE' });

    const categories = [
      { id: 'ALL', title: 'All Products', count: totalProductsCount, iconName: 'LayoutGrid' },
      ...ALL_CATEGORIES.map((cat) => ({
        ...cat,
        count: categoryCountsMap[cat.id] || 0,
      })),
    ];

    // Aggregate brand counts
    const brandCountsRaw = await Product.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const brands = brandCountsRaw.map((b) => ({
      name: b._id,
      count: b.count,
    }));

    // Aggregate min and max price
    const priceStats = await Product.aggregate([
      { $match: { status: 'ACTIVE' } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$mrp' },
          maxPrice: { $max: '$mrp' },
        },
      },
    ]);

    const minPrice = priceStats[0]?.minPrice || 0;
    const maxPrice = priceStats[0]?.maxPrice || 200000;

    return NextResponse.json({
      success: true,
      totalProductsCount,
      categories,
      brands,
      priceRange: { min: minPrice, max: maxPrice },
    });
  } catch (error: any) {
    console.error('Error fetching categories & brands:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch categories & brands' },
      { status: 500 }
    );
  }
}
