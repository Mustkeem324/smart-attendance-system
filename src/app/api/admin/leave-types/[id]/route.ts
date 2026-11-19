import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    const { name, annualQuota, maxDaysPerYear, isPaid, requiresAttachment, requiresProof, isActive } = body;

    const updated = await prisma.leaveType.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(maxDaysPerYear !== undefined || annualQuota !== undefined
          ? { maxDaysPerYear: parseFloat(maxDaysPerYear || annualQuota) }
          : {}),
        ...(isPaid !== undefined ? { isPaid: Boolean(isPaid) } : {}),
        ...(requiresAttachment !== undefined || requiresProof !== undefined
          ? { requiresAttachment: Boolean(requiresAttachment || requiresProof) }
          : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return NextResponse.json({ success: true, leaveType: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
    ]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.leaveType.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Leave type deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
