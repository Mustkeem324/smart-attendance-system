import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isElevated = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.SALES_MANAGER as any,
      Role.HR_MANAGER,
    ]);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const shopId = searchParams.get('shopId');
    const employeeId = searchParams.get('employeeId');

    const where: any = { organizationId: session.user.organizationId };

    if (!isElevated && session.employee) {
      where.employeeId = session.employee.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) where.visitDate = date;
    if (shopId) where.shopId = shopId;

    const visits = await prisma.shopVisit.findMany({
      where,
      include: {
        shop: true,
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
        deliveries: {
          select: { id: true, deliveryNumber: true, status: true, finalDeliveryValue: true },
        },
      },
      orderBy: { checkInTime: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, count: visits.length, visits });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
