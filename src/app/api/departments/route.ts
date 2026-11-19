import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const departments = await prisma.department.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, departments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER]);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, code, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Department name and code are required' }, { status: 400 });
    }

    const dept = await prisma.department.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        code: code.toUpperCase().trim(),
        description,
      },
    });

    return NextResponse.json({ success: true, department: dept });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
