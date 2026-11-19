import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
      include: {
        shop: true,
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, phone: true },
        },
        shopVisit: true,
        items: {
          include: { product: true },
        },
        photos: true,
        verifications: true,
        revisions: true,
        payments: true,
      },
    });

    if (!delivery || delivery.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Delivery record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, delivery });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
