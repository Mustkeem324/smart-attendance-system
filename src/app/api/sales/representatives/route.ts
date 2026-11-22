export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reps = await prisma.employee.findMany({
      where: {
        organizationId: session.user.organizationId,
        employmentStatus: 'ACTIVE',
      },
      include: {
        department: true,
        branch: true,
        salesProfile: true,
        salesTargets: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            assignedShops: true,
            shopVisits: true,
            deliveries: true,
            paymentCollections: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    // Compute live performance metrics for each rep
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const formattedReps = await Promise.all(
      reps.map(async (r) => {
        const deliveries = await prisma.delivery.findMany({
          where: { employeeId: r.id },
          select: { finalDeliveryValue: true, status: true, totalQuantity: true },
        });

        const completedDels = deliveries.filter((d) => d.status === 'VERIFIED' || d.status === 'COMPLETED');
        const pendingDels = deliveries.filter((d) => d.status === 'SUBMITTED' || d.status === 'PENDING_VERIFICATION');
        const totalTurnover = completedDels.reduce((sum, d) => sum + d.finalDeliveryValue, 0);
        const totalUnits = completedDels.reduce((sum, d) => sum + d.totalQuantity, 0);

        const payments = await prisma.paymentCollection.findMany({
          where: { employeeId: r.id },
          select: { amount: true },
        });
        const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

        const currentTarget = r.salesTargets[0] || null;

        return {
          id: r.id,
          employeeCode: r.employeeCode,
          name: `${r.firstName} ${r.lastName}`,
          email: r.email,
          phone: r.phone,
          designation: r.designation,
          department: r.department?.name || 'Field Sales',
          branch: r.branch?.name || 'HQ',
          avatar: r.profilePhoto,
          territory: r.salesProfile?.territory || 'Unassigned',
          vehicleType: r.salesProfile?.vehicleType || 'Not Registered',
          commissionRate: r.salesProfile?.commissionRatePercent ?? 2.5,
          assignedShopsCount: r._count.assignedShops,
          totalVisitsCount: r._count.shopVisits,
          deliveriesCompleted: completedDels.length,
          deliveriesPending: pendingDels.length,
          totalUnitsDelivered: totalUnits,
          totalTurnover: parseFloat(totalTurnover.toFixed(2)),
          totalPaymentCollected: parseFloat(totalCollected.toFixed(2)),
          target: currentTarget
            ? {
                month: currentTarget.month,
                year: currentTarget.year,
                targetTurnover: currentTarget.targetTurnover,
                achievedTurnover: totalTurnover,
                progressPercent: Math.min(100, Math.round((totalTurnover / Math.max(1, currentTarget.targetTurnover)) * 100)),
              }
            : null,
        };
      })
    );

    return NextResponse.json({ success: true, count: formattedReps.length, representatives: formattedReps });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { employeeId, territory, vehicleNumber, vehicleType, commissionRatePercent, dailyVisitTarget, monthlySalesTarget } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const profile = await prisma.salesRepresentativeProfile.upsert({
      where: { employeeId },
      update: {
        territory: territory || undefined,
        vehicleNumber: vehicleNumber || undefined,
        vehicleType: vehicleType || undefined,
        commissionRatePercent: commissionRatePercent !== undefined ? parseFloat(commissionRatePercent) : undefined,
        dailyVisitTarget: dailyVisitTarget !== undefined ? parseInt(dailyVisitTarget) : undefined,
        monthlySalesTarget: monthlySalesTarget !== undefined ? parseFloat(monthlySalesTarget) : undefined,
      },
      create: {
        organizationId: session.user.organizationId,
        employeeId,
        territory: territory || 'Central Zone',
        vehicleNumber: vehicleNumber || null,
        vehicleType: vehicleType || 'Bike',
        commissionRatePercent: commissionRatePercent !== undefined ? parseFloat(commissionRatePercent) : 2.5,
        dailyVisitTarget: dailyVisitTarget !== undefined ? parseInt(dailyVisitTarget) : 10,
        monthlySalesTarget: monthlySalesTarget !== undefined ? parseFloat(monthlySalesTarget) : 100000,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
