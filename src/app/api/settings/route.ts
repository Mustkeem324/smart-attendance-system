export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';

export interface WorkspaceSettingsConfig {
  defaultGeofenceRadiusMeters: number;
  minGpsAccuracyMeters: number;
  workStartTime: string;
  gracePeriodMinutes: number;
  requireSelfieOnPunch: boolean;
  strictGeofenceEnforcement: boolean;
  mockLocationDetection: boolean;
  notifyLateArrivals: boolean;
  notifyLeaveRequests: boolean;
  notifyLowStock: boolean;
  dateFormat: string;
  timezone: string;
}

const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettingsConfig = {
  defaultGeofenceRadiusMeters: 75,
  minGpsAccuracyMeters: 30,
  workStartTime: '09:30',
  gracePeriodMinutes: 15,
  requireSelfieOnPunch: true,
  strictGeofenceEnforcement: true,
  mockLocationDetection: true,
  notifyLateArrivals: true,
  notifyLeaveRequests: true,
  notifyLowStock: true,
  dateFormat: 'DD MMM YYYY',
  timezone: 'Asia/Kolkata',
};

function mergeWorkspaceSettings(raw: unknown): WorkspaceSettingsConfig {
  const existing = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  const attendance = existing.attendance && typeof existing.attendance === 'object' ? existing.attendance : existing;
  return {
    defaultGeofenceRadiusMeters: Number(attendance.defaultGeofenceRadiusMeters) || DEFAULT_WORKSPACE_SETTINGS.defaultGeofenceRadiusMeters,
    minGpsAccuracyMeters: Number(attendance.minGpsAccuracyMeters) || DEFAULT_WORKSPACE_SETTINGS.minGpsAccuracyMeters,
    workStartTime: String(attendance.workStartTime || DEFAULT_WORKSPACE_SETTINGS.workStartTime),
    gracePeriodMinutes:
      attendance.gracePeriodMinutes !== undefined
        ? Number(attendance.gracePeriodMinutes)
        : DEFAULT_WORKSPACE_SETTINGS.gracePeriodMinutes,
    requireSelfieOnPunch:
      attendance.requireSelfieOnPunch !== undefined
        ? Boolean(attendance.requireSelfieOnPunch)
        : DEFAULT_WORKSPACE_SETTINGS.requireSelfieOnPunch,
    strictGeofenceEnforcement:
      attendance.strictGeofenceEnforcement !== undefined
        ? Boolean(attendance.strictGeofenceEnforcement)
        : DEFAULT_WORKSPACE_SETTINGS.strictGeofenceEnforcement,
    mockLocationDetection:
      attendance.mockLocationDetection !== undefined
        ? Boolean(attendance.mockLocationDetection)
        : DEFAULT_WORKSPACE_SETTINGS.mockLocationDetection,
    notifyLateArrivals:
      attendance.notifyLateArrivals !== undefined
        ? Boolean(attendance.notifyLateArrivals)
        : DEFAULT_WORKSPACE_SETTINGS.notifyLateArrivals,
    notifyLeaveRequests:
      attendance.notifyLeaveRequests !== undefined
        ? Boolean(attendance.notifyLeaveRequests)
        : DEFAULT_WORKSPACE_SETTINGS.notifyLeaveRequests,
    notifyLowStock:
      attendance.notifyLowStock !== undefined
        ? Boolean(attendance.notifyLowStock)
        : DEFAULT_WORKSPACE_SETTINGS.notifyLowStock,
    dateFormat: String(attendance.dateFormat || DEFAULT_WORKSPACE_SETTINGS.dateFormat),
    timezone: String(attendance.timezone || DEFAULT_WORKSPACE_SETTINGS.timezone),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        settings: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        code: org.code,
        slug: org.slug,
        email: org.email,
        phone: org.phone || '',
        address: org.address || '',
        logo: org.logo || '',
      },
      settings: mergeWorkspaceSettings(org.settings),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = requireRole(session.user.role, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN]);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const prevJson =
      org.settings && typeof org.settings === 'object' ? (org.settings as Record<string, any>) : {};

    const incomingSettings = body?.settings || body;
    const mergedAttendance = mergeWorkspaceSettings({
      attendance: {
        ...(prevJson.attendance || prevJson),
        ...incomingSettings,
      },
    });

    // Clamp geofence and accuracy thresholds safely
    mergedAttendance.defaultGeofenceRadiusMeters = Math.max(
      25,
      Math.min(1000, Number(mergedAttendance.defaultGeofenceRadiusMeters) || 75)
    );
    mergedAttendance.minGpsAccuracyMeters = Math.max(
      5,
      Math.min(250, Number(mergedAttendance.minGpsAccuracyMeters) || 30)
    );
    mergedAttendance.gracePeriodMinutes = Math.max(
      0,
      Math.min(120, Number(mergedAttendance.gracePeriodMinutes) || 0)
    );

    const orgUpdates: Record<string, any> = {
      settings: {
        ...prevJson,
        attendance: mergedAttendance,
      },
    };

    if (body?.organization?.name && String(body.organization.name).trim()) {
      orgUpdates.name = String(body.organization.name).trim();
    }
    if (body?.organization?.email && String(body.organization.email).trim()) {
      orgUpdates.email = String(body.organization.email).trim().toLowerCase();
    }
    if (body?.organization?.phone !== undefined) {
      orgUpdates.phone = body.organization.phone ? String(body.organization.phone).trim() : null;
    }
    if (body?.organization?.address !== undefined) {
      orgUpdates.address = body.organization.address ? String(body.organization.address).trim() : null;
    }

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: orgUpdates,
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        settings: true,
      },
    });

    await createAuditLog({
      organizationId: org.id,
      userId: session.user.id,
      action: 'UPDATE_WORKSPACE_SETTINGS',
      entity: 'Organization',
      entityId: org.id,
      oldValues: { name: org.name, email: org.email, settings: prevJson },
      newValues: { name: updated.name, email: updated.email, settings: updated.settings },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Workspace settings saved successfully.',
      organization: {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        slug: updated.slug,
        email: updated.email,
        phone: updated.phone || '',
        address: updated.address || '',
        logo: updated.logo || '',
      },
      settings: mergeWorkspaceSettings(updated.settings),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
