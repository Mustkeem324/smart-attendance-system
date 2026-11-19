import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const leaveTypes = await prisma.leaveType.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        _count: { select: { leaveRequests: true, leaveBalances: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, leaveTypes });
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
    const {
      name,
      code,
      description,
      annualQuota = 12,
      maxDaysPerYear,
      isPaid = true,
      requiresProof = false,
      requiresAttachment,
    } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        code: code.toUpperCase().trim(),
        description,
        maxDaysPerYear: parseFloat(maxDaysPerYear || annualQuota),
        isPaid: Boolean(isPaid),
        requiresAttachment: Boolean(requiresAttachment || requiresProof),
      },
    });

    return NextResponse.json({ success: true, leaveType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
