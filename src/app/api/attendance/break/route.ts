import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startBreak, endBreak } from '@/lib/shift-roster-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const todayBreaks = await prisma.breakRecord.findMany({
      where: {
        employeeId: session.employee.id,
        date: todayStr,
      },
      orderBy: { startTime: 'desc' },
    });

    const activeBreak = todayBreaks.find((b) => b.endTime === null) || null;
    const totalMinutes = todayBreaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    return NextResponse.json({
      success: true,
      activeBreak,
      todayBreaks,
      totalMinutes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const body = await req.json();
    const { action, breakType = 'LUNCH' } = body; // action: 'START' | 'END'

    if (action === 'START') {
      const record = await startBreak(session.employee.id, breakType);
      return NextResponse.json({ success: true, message: `${breakType} break started`, record });
    } else if (action === 'END') {
      const record = await endBreak(session.employee.id);
      return NextResponse.json({ success: true, message: 'Break completed', record });
    } else {
      return NextResponse.json({ error: 'Action must be START or END' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
