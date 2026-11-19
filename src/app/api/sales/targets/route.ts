import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();

    const targets = await prisma.salesTarget.findMany({
      where: {
        organizationId: session.user.organizationId,
        month,
        year,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { targetTurnover: 'desc' },
    });

    // Compute live achievements for these targets from deliveries & visits
    const enrichedTargets = await Promise.all(
      targets.map(async (t) => {
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

        const [visitsCount, deliveries] = await Promise.all([
          prisma.shopVisit.count({
            where: {
              employeeId: t.employeeId,
              checkInTime: { gte: startDate, lte: endDate },
            },
          }),
          prisma.delivery.findMany({
            where: {
              employeeId: t.employeeId,
              createdAt: { gte: startDate, lte: endDate },
              status: { in: ['VERIFIED', 'COMPLETED'] },
            },
            select: { finalDeliveryValue: true },
          }),
        ]);

        const achievedTurnover = deliveries.reduce((sum, d) => sum + d.finalDeliveryValue, 0);
        const achievedDeliveries = deliveries.length;

        const visitProgress = Math.min(100, Math.round((visitsCount / Math.max(1, t.targetVisits)) * 100));
        const delProgress = Math.min(100, Math.round((achievedDeliveries / Math.max(1, t.targetDeliveries)) * 100));
        const turnoverProgress = Math.min(100, Math.round((achievedTurnover / Math.max(1, t.targetTurnover)) * 100));

        return {
          ...t,
          achievedVisits: visitsCount,
          achievedDeliveries,
          achievedTurnover: parseFloat(achievedTurnover.toFixed(2)),
          visitProgress,
          delProgress,
          turnoverProgress,
        };
      })
    );

    return NextResponse.json({
      success: true,
      month,
      year,
      count: enrichedTargets.length,
      targets: enrichedTargets,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { employeeId, month, year, targetVisits, targetDeliveries, targetTurnover, notes } = body;

    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: 'Employee ID, month, and year are required' }, { status: 400 });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    const target = await prisma.salesTarget.upsert({
      where: {
        organizationId_employeeId_month_year: {
          organizationId: session.user.organizationId,
          employeeId,
          month: m,
          year: y,
        },
      },
      update: {
        targetVisits: targetVisits !== undefined ? parseInt(targetVisits) : undefined,
        targetDeliveries: targetDeliveries !== undefined ? parseInt(targetDeliveries) : undefined,
        targetTurnover: targetTurnover !== undefined ? parseFloat(targetTurnover) : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      create: {
        organizationId: session.user.organizationId,
        employeeId,
        month: m,
        year: y,
        targetVisits: targetVisits ? parseInt(targetVisits) : 50,
        targetDeliveries: targetDeliveries ? parseInt(targetDeliveries) : 30,
        targetTurnover: targetTurnover ? parseFloat(targetTurnover) : 150000,
        notes,
      },
      include: {
        employee: true,
      },
    });

    return NextResponse.json({ success: true, target });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
