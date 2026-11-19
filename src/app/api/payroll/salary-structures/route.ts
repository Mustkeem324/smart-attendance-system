import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const structures = await prisma.salaryStructure.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        components: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, structures });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, code, annualCtc, monthlyGross, components = [] } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    const structure = await prisma.salaryStructure.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        code: code.toUpperCase().trim(),
        annualCtc: annualCtc ? parseFloat(annualCtc) : 0,
        monthlyGross: monthlyGross ? parseFloat(monthlyGross) : 0,
        components: {
          create: components.map((c: any) => ({
            name: c.name,
            type: c.type, // EARNING or DEDUCTION
            calculationType: c.calculationType || 'FIXED',
            monthlyAmount: parseFloat(c.monthlyAmount || 0),
          })),
        },
      },
      include: { components: true },
    });

    return NextResponse.json({ success: true, structure });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
