export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import { EmployeeTask } from '@/models/employee-portal';
import { dispatchNotifications } from '@/lib/notifications';
import { Role } from '@prisma/client';

const ELEVATED_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.COMPANY_ADMIN,
  Role.HR_MANAGER,
  Role.TEAM_MANAGER,
  Role.SALES_MANAGER,
];

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const requestedEmployeeId = searchParams.get('employeeId');

    const isElevated = requireRole(session.user.role, ELEVATED_ROLES);
    const targetEmployeeId =
      isElevated && requestedEmployeeId ? requestedEmployeeId : session.employee.id;

    const query: any = {
      organizationId: session.user.organizationId,
      employeeId: targetEmployeeId,
    };
    if (statusFilter && ['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(statusFilter)) {
      query.status = statusFilter;
    }

    const tasks = await EmployeeTask.find(query).sort({ status: 1, dueDate: 1, createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      tasks: tasks.map((t: any) => ({
        id: String(t._id),
        employeeId: t.employeeId,
        title: t.title,
        description: t.description,
        assignedDate: t.assignedDate,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        assignedByName: t.assignedByName,
        assignedByRole: t.assignedByRole,
        progressNotes: t.progressNotes,
        completedAt: t.completedAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description = '', dueDate, priority = 'MEDIUM', employeeId: targetId } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const isElevated = requireRole(session.user.role, ELEVATED_ROLES);
    let assignToEmployeeId = session.employee.id;

    if (targetId && targetId !== session.employee.id) {
      if (!isElevated) {
        return NextResponse.json({ error: 'Forbidden: Only managers/HR can assign tasks to other employees.' }, { status: 403 });
      }
      const targetEmp = await prisma.employee.findUnique({
        where: { id: targetId },
        select: { id: true, organizationId: true },
      });
      if (!targetEmp || targetEmp.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Target employee not found' }, { status: 404 });
      }
      assignToEmployeeId = targetEmp.id;
    }

    await connectToDatabase();
    const assignedByName = `${session.employee.firstName} ${session.employee.lastName}`;
    const validPriority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority) ? priority : 'MEDIUM';

    const created = await EmployeeTask.create({
      organizationId: session.user.organizationId,
      employeeId: assignToEmployeeId,
      title: String(title).trim(),
      description: String(description).trim(),
      assignedDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: validPriority,
      status: 'PENDING',
      assignedByEmployeeId: session.employee.id,
      assignedByName,
      assignedByRole: session.user.role,
    });

    const assignedEmp = await prisma.employee.findUnique({
      where: { id: assignToEmployeeId },
      select: { userId: true },
    });
    if (assignedEmp?.userId) {
      await dispatchNotifications({
        organizationId: session.user.organizationId,
        userIds: [assignedEmp.userId],
        title: `New Task Assigned: ${String(title).trim()}`,
        message: `${assignedByName} assigned "${String(title).trim()}" (Priority: ${validPriority})${dueDate ? ` due on ${dueDate}` : ''}.${description ? ` Notes: ${String(description).trim()}` : ''}`,
        type: validPriority === 'URGENT' || validPriority === 'HIGH' ? 'WARNING' : 'INFO',
        category: 'TASK',
        priority: validPriority === 'URGENT' ? 'URGENT' : validPriority === 'HIGH' ? 'HIGH' : 'NORMAL',
        link: '/employee/tasks',
        actionLabel: 'Open My Tasks',
        actorName: assignedByName,
        actorRole: session.user.role,
        details: {
          Priority: validPriority,
          AssignedBy: assignedByName,
          ...(dueDate ? { DueDate: dueDate } : {}),
        },
      }).catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        task: {
          id: String(created._id),
          employeeId: created.employeeId,
          title: created.title,
          description: created.description,
          assignedDate: created.assignedDate,
          dueDate: created.dueDate,
          priority: created.priority,
          status: created.status,
          assignedByName: created.assignedByName,
          assignedByRole: created.assignedByRole,
          progressNotes: created.progressNotes,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create task' }, { status: 500 });
  }
}
