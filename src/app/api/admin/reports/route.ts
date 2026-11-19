import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!requireRole(session.user, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { organizationId } = session.user;

    const departments = await prisma.department.findMany({
      where: { organizationId },
      select: { id: true, name: true, code: true },
    });

    const branches = await prisma.branch.findMany({
      where: { organizationId },
      select: { id: true, name: true, code: true },
    });

    const reportTypes = [
      { id: 'DAILY_ATTENDANCE', name: 'Daily Attendance Report', description: 'Comprehensive presence & biometric punches for a specific date' },
      { id: 'WEEKLY_ATTENDANCE', name: 'Weekly Attendance Report', description: '7-day overview with daily present/absent ratios' },
      { id: 'MONTHLY_ATTENDANCE', name: 'Monthly Attendance Report', description: 'Aggregated monthly working hours, leaves, and overtime' },
      { id: 'ANNUAL_ATTENDANCE', name: 'Annual Attendance Report', description: '12-month organizational attendance performance' },
      { id: 'EMPLOYEE_ATTENDANCE', name: 'Individual Employee Report', description: 'Detailed date-by-date punch card for a single employee' },
      { id: 'DEPARTMENT_ATTENDANCE', name: 'Departmental Attendance Report', description: 'Attendance metrics broken down by department' },
      { id: 'BRANCH_ATTENDANCE', name: 'Branch Performance Report', description: 'Attendance metrics across office branches and geofences' },
      { id: 'LATE_ARRIVAL', name: 'Late Arrivals & Tardy Report', description: 'Employees punching in after shift grace period' },
      { id: 'ABSENTEE', name: 'Absenteeism & Unexcused Absences', description: 'Records of unexcused absences and absence frequency' },
      { id: 'OVERTIME', name: 'Overtime & Extended Hours Report', description: 'Approved overtime hours worked above standard shift limits' },
      { id: 'JOINING', name: 'Employee Joinings Report', description: 'New personnel onboarding across departments and dates' },
      { id: 'RESIGNATION', name: 'Employee Exits & Resignations', description: 'Attrition records and last working day statuses' },
      { id: 'ATTENDANCE_EXCEPTION', name: 'Attendance Exceptions & Geofence Breaches', description: 'Off-site punches, low-accuracy GPS attempts, and correction requests' },
    ];

    return NextResponse.json({
      success: true,
      reportTypes,
      filters: {
        departments,
        branches,
        formats: ['xlsx', 'csv', 'pdf'],
      },
    });
  } catch (err: any) {
    console.error('Error in /api/admin/reports:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
