export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateDailyEmployeeStatuses } from '@/lib/analytics';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.user, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const statusFilter = searchParams.get('status') || undefined;
    const query = searchParams.get('query')?.toLowerCase().trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));
    const sortBy = searchParams.get('sortBy') || 'name'; // 'name', 'checkInTime', 'status', 'totalHours'
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';

    let list = await calculateDailyEmployeeStatuses(session.user.organizationId, dateStr, {
      branchId,
      departmentId,
    });

    // Filter by query (name, code, email, designation)
    if (query) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.employeeCode.toLowerCase().includes(query) ||
          e.email.toLowerCase().includes(query) ||
          e.designation.toLowerCase().includes(query)
      );
    }

    // Filter by status if provided
    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter((e) => e.status === statusFilter);
    }

    // Sort
    list.sort((a: any, b: any) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    const totalRecords = list.length;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const paginated = list.slice((page - 1) * limit, page * limit);

    // Summary counts for quick status tab counts
    const summary = {
      total: list.length,
      present: list.filter((e) => e.status === 'PRESENT' || e.status === 'LATE' || e.status === 'HALF_DAY').length,
      absent: list.filter((e) => e.status === 'ABSENT').length,
      onLeave: list.filter((e) => e.status === 'ON_LEAVE').length,
      currentlyCheckedIn: list.filter((e) => e.checkInTime && !e.checkOutTime).length,
      checkedOut: list.filter((e) => Boolean(e.checkOutTime)).length,
      late: list.filter((e) => e.lateMinutes > 0).length,
    };

    return NextResponse.json({
      success: true,
      date: dateStr,
      summary,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
      employees: paginated,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/dashboard/live-attendance:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
