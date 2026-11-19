import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { cancelLeaveRequest } from '@/lib/leave-engine';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const { id } = params;

    const result = await cancelLeaveRequest(id, session.employee.id);

    return NextResponse.json({
      success: true,
      message: 'Leave request cancelled and balance restored to ledger.',
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
