export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import { EmployeeSupportTicket } from '@/models/employee-portal';
import { notifyOrgManagers } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    await connectToDatabase();
    const tickets = await EmployeeSupportTicket.find({
      organizationId: session.user.organizationId,
      employeeId: session.employee.id,
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t: any) => ({
        id: String(t._id),
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        description: t.description,
        status: t.status,
        resolutionNotes: t.resolutionNotes || '',
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load support requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, category = 'HR_QUERY', priority = 'MEDIUM', description } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 });
    }

    await connectToDatabase();
    const created = await EmployeeSupportTicket.create({
      organizationId: session.user.organizationId,
      employeeId: session.employee.id,
      userId: session.user.id,
      subject: String(subject).trim(),
      category: ['HR_QUERY', 'ATTENDANCE_ISSUE', 'PAYROLL_QUERY', 'IT_SUPPORT', 'LEAVE_QUERY', 'OTHER'].includes(category)
        ? category
        : 'HR_QUERY',
      priority: ['LOW', 'MEDIUM', 'HIGH'].includes(priority) ? priority : 'MEDIUM',
      description: String(description).trim(),
      status: 'OPEN',
    });

    // Notify organization HR/Admins with full ticket details
    await notifyOrgManagers({
      organizationId: session.user.organizationId,
      title: `Support Request: ${String(subject).trim().slice(0, 70)}`,
      message: `${session.employee.firstName} ${session.employee.lastName} (${session.employee.employeeCode}) raised a ${category.replace(/_/g, ' ')} request: "${String(description).trim()}"`,
      type: priority === 'HIGH' ? 'ALERT' : 'INFO',
      category: 'SUPPORT',
      priority: priority === 'HIGH' ? 'URGENT' : priority === 'LOW' ? 'LOW' : 'NORMAL',
      link: '/admin/notifications',
      actionLabel: 'Review Support Queue',
      actorName: `${session.employee.firstName} ${session.employee.lastName}`,
      actorRole: session.user.role,
      details: {
        TicketID: String(created._id),
        EmployeeCode: session.employee.employeeCode,
        Category: category,
        Priority: priority,
      },
      excludeUserId: session.user.id,
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        ticket: {
          id: String(created._id),
          subject: created.subject,
          category: created.category,
          priority: created.priority,
          description: created.description,
          status: created.status,
          createdAt: created.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit support request' }, { status: 500 });
  }
}
