import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Retailer } from '@/models/electronics-sales';
import { apiSuccess, apiError } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getAuthSession(req);

    if (!session || !session.user) {
      return apiError('Not authenticated', 401);
    }

    // Check if user is also linked to a Retailer
    const retailer = await Retailer.findOne({ email: session.user.email }).lean();

    return apiSuccess({
      user: {
        ...session.user,
        name: session.employee ? `${session.employee.firstName} ${session.employee.lastName}` : session.user.email,
        employee: session.employee,
        retailer: retailer ? {
          id: retailer._id,
          name: retailer.name,
          dealerCode: retailer.dealerCode,
          creditLimit: retailer.creditLimit,
          outstandingBalance: retailer.outstandingBalance,
          status: retailer.status,
        } : null,
      },
    });
  } catch (err: any) {
    console.error('V1 Auth Me Error:', err);
    return apiError(err.message || 'Internal server error', 500);
  }
}
