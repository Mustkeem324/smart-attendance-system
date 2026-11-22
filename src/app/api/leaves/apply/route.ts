export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { submitLeaveRequest } from '@/lib/leave-engine';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const body = await req.json();
    const { leaveTypeId, startDate, endDate, reason, isHalfDay, halfDayPeriod, documentUrl } = body;

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Please provide all required fields (Leave Type, Dates, Reason)' }, { status: 400 });
    }

    // Format start and end date strings (YYYY-MM-DD)
    const startDateStr = typeof startDate === 'string' && startDate.includes('T') ? startDate.split('T')[0] : startDate;
    const endDateStr = typeof endDate === 'string' && endDate.includes('T') ? endDate.split('T')[0] : endDate;

    const result = await submitLeaveRequest({
      organizationId: session.user.organizationId,
      employeeId: session.employee.id,
      leaveTypeId,
      startDateStr,
      endDateStr,
      isHalfDay: Boolean(isHalfDay),
      halfDayPeriod: halfDayPeriod || undefined,
      reason,
      documentUrl: documentUrl || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Leave application submitted successfully',
      leaveRequest: result.leaveRequest,
      calculation: result.calculation,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
