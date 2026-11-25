export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { EmployeeTask } from '@/models/employee-portal';
import { Role } from '@prisma/client';

const ELEVATED_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.COMPANY_ADMIN,
  Role.HR_MANAGER,
  Role.TEAM_MANAGER,
  Role.SALES_MANAGER,
];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const existing = await EmployeeTask.findById(params.id);
    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isElevated = requireRole(session.user.role, ELEVATED_ROLES);
    if (!isElevated && existing.employeeId !== session.employee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    if (body.status && ['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(body.status)) {
      existing.status = body.status;
      existing.completedAt = body.status === 'COMPLETED' ? new Date() : undefined;
    }
    if (typeof body.progressNotes === 'string') {
      existing.progressNotes = body.progressNotes.trim();
    }
    if (isElevated || existing.assignedByEmployeeId === session.employee.id) {
      if (typeof body.title === 'string' && body.title.trim()) existing.title = body.title.trim();
      if (typeof body.description === 'string') existing.description = body.description.trim();
      if (body.priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(body.priority)) {
        existing.priority = body.priority;
      }
    }

    await existing.save();

    return NextResponse.json({
      success: true,
      task: {
        id: String(existing._id),
        title: existing.title,
        description: existing.description,
        assignedDate: existing.assignedDate,
        dueDate: existing.dueDate,
        priority: existing.priority,
        status: existing.status,
        assignedByName: existing.assignedByName,
        progressNotes: existing.progressNotes,
        completedAt: existing.completedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const existing = await EmployeeTask.findById(params.id);
    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isElevated = requireRole(session.user.role, ELEVATED_ROLES);
    const isSelfCreated = existing.assignedByEmployeeId === session.employee.id && existing.employeeId === session.employee.id;
    if (!isElevated && !isSelfCreated) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await EmployeeTask.deleteOne({ _id: existing._id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete task' }, { status: 500 });
  }
}
