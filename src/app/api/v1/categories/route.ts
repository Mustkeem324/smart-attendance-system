import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ProductCategory, Product } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';

const DEFAULT_CATEGORIES = [
  { code: 'SMARTPHONES', name: 'Smartphones', description: 'Flagship & commercial 5G Android & iOS smartphones' },
  { code: 'TABLETS', name: 'Tablets', description: 'Productivity and enterprise tablets & iPads' },
  { code: 'SMARTWATCHES', name: 'Smartwatches', description: 'Fitness trackers, cellular & luxury smart wearables' },
  { code: 'EARBUDS', name: 'Wireless Earbuds', description: 'True wireless stereo earbuds with ANC' },
  { code: 'HEADPHONES', name: 'Headphones', description: 'Over-ear studio monitors and noise cancelling headphones' },
  { code: 'CHARGERS', name: 'Chargers', description: 'GaN fast wall chargers, desktop charging stations' },
  { code: 'POWERBANKS', name: 'Power Banks', description: 'High capacity fast-charging portable power banks' },
  { code: 'ACCESSORIES', name: 'Mobile Accessories', description: 'Tough phone cases, tempered glass & cables' },
  { code: 'SPEAKERS', name: 'Speakers', description: 'Portable Bluetooth & party audio speakers' },
  { code: 'LAPTOPS', name: 'Laptops', description: 'Business laptops, ultrabooks and creator machines' },
  { code: 'ELECTRONICS', name: 'Smart Electronics', description: 'IoT smart home hubs, streaming sticks and peripherals' },
];

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();

    // Aggregate product counts per category
    const productCounts = await Product.aggregate([
      { $match: { status: 'ACTIVE' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$stockQuantity' },
        },
      },
    ]);

    const countMap: Record<string, { count: number; stock: number }> = {};
    productCounts.forEach((pc) => {
      countMap[pc._id] = { count: pc.count, stock: pc.totalStock || 0 };
    });

    const categoriesWithStats = DEFAULT_CATEGORIES.map((cat) => ({
      code: cat.code,
      name: cat.name,
      description: cat.description,
      productCount: countMap[cat.code]?.count || 0,
      totalStock: countMap[cat.code]?.stock || 0,
      isActive: true,
    }));

    return apiSuccess(categoriesWithStats);
  } catch (err: any) {
    console.error('V1 Categories GET Error:', err);
    return apiError(err.message || 'Failed to fetch categories', 500);
  }
}
