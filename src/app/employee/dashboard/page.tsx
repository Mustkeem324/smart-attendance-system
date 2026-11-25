'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';
import GPSStatusBadge from '@/components/GPSStatusBadge';
import LiveCameraModal from '@/components/LiveCameraModal';
import EmployeePhotoUploadModal, { saveOwnProfilePhoto } from '@/components/employees/EmployeePhotoUploadModal';
import { SkeletonCards, StatusBadge, EmptyState } from '@/components/ui/EnterpriseUI';
import EmployeeAttendanceAnalytics from '@/components/employee-dashboard/EmployeeAttendanceAnalytics';
import {
  ApplyLeaveModal,
  TaskFormModal,
  PublishAnnouncementModal,
} from '@/components/employee-dashboard/EmployeeQuickModals';
import { useEmployeeAttendanceActions } from '@/hooks/useEmployeeAttendanceActions';
import {
  Clock,
  CheckCircle2,
  LogOut,
  LogIn,
  AlertCircle,
  Calendar,
  Camera,
  Coffee,
  Building2,
  MapPin,
  UserCheck,
  Briefcase,
  CheckSquare,
  Store,
  FileText,
  Megaphone,
  Activity,
  Plus,
  Download,
  ArrowRight,
  Hourglass,
  CalendarPlus,
  User,
  Award,
  Sparkles,
} from 'lucide-react';

function getGreeting(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function EmployeeDashboardPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useUi();

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [clientClock, setClientClock] = useState<Date | null>(null);

  const [isOwnPhotoOpen, setIsOwnPhotoOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useEffect(() => {
    const now = new Date();
    setClientClock(now);
    setSelectedMonth((prev) => prev || now.toISOString().slice(0, 7));
    const timer = setInterval(() => setClientClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboard = useCallback(async (monthOverride?: string) => {
    try {
      const m = monthOverride || selectedMonth;
      const qs = m ? `?month=${encodeURIComponent(m)}` : '';
      const res = await fetch(`/api/employee/dashboard${qs}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Unable to load dashboard');
      } else {
        setError(null);
        setDashboard(json);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const {
    setCurrentGps,
    isCameraModalOpen,
    setIsCameraModalOpen,
    cameraModalMode,
    submitting,
    breakLoading,
    feedback,
    openCheckIn,
    openCheckOut,
    submitPunchPhoto,
    toggleBreak,
  } = useEmployeeAttendanceActions({ onSuccess: () => fetchDashboard() });

  const handleTaskStatusUpdate = async (taskId: string, nextStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      const res = await fetch(`/api/employee/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || 'Failed to update task status');
        return;
      }
      toast.success(`Task marked ${nextStatus.replace(/_/g, ' ').toLowerCase()}.`);
      await fetchDashboard();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleAnnouncementRead = async (annId: string, isRead: boolean) => {
    if (annId.startsWith('holiday-')) return;
    try {
      const res = await fetch(`/api/employee/announcements/${annId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !isRead }),
      });
      if (res.ok) {
        await fetchDashboard();
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCards count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="enterprise-card p-8 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-[#EF476F] mx-auto" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Could not load Employee Dashboard</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <button onClick={() => fetchDashboard()} className="enterprise-btn-primary text-xs">
          Retry
        </button>
      </div>
    );
  }

  // Fallback for accounts with no linked Employee record (e.g., Super Admin previewing)
  if (dashboard && dashboard.hasEmployeeProfile === false) {
    return (
      <div className="enterprise-card p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6F5FF] text-[#6538ED]">
          <User className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Welcome, {dashboard.user?.email}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your account is configured as an administrative role ({dashboard.user?.role}) without a linked Employee HR record.
          Use the Executive HR Dashboard or Distribution Console to manage workforce operations.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/admin/dashboard" className="enterprise-btn-primary text-xs">
            Open Executive Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setIsOwnPhotoOpen(true)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Add Own Photo
          </button>
        </div>

        <EmployeePhotoUploadModal
          isOpen={isOwnPhotoOpen}
          onClose={() => setIsOwnPhotoOpen(false)}
          isSelfService
          targetUserId={dashboard.user?.id}
          currentPhoto={dashboard.user?.profilePhoto}
          employeeName={dashboard.user?.email}
          onSave={async (url) => {
            await saveOwnProfilePhoto(url);
            await refreshUser();
            await fetchDashboard();
            toast.success('Profile photo updated.');
          }}
        />
      </div>
    );
  }

  const profile = dashboard.profile;
  const kpis = dashboard.kpis;
  const todayAtt = dashboard.todayAttendance;
  const shiftOverview = dashboard.shiftOverview;
  const leaves = dashboard.leaves;
  const analytics = dashboard.analytics;
  const tasks = dashboard.tasks || [];
  const fieldSales = dashboard.fieldSales;
  const recentActivity = dashboard.recentActivity || [];
  const announcements = dashboard.announcements || [];
  const docs = dashboard.documents;

  const isElevatedAnnouncer = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER'].includes(
    profile.role || ''
  );

  const greetingText = clientClock ? getGreeting(clientClock.getHours()) : 'Welcome';
  const formattedDate = clientClock
    ? clientClock.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : dashboard.date;

  const isCheckedIn = todayAtt.isCheckedIn;
  const isCheckedOut = todayAtt.isCheckedOut;

  let liveElapsed = '--';
  if (isCheckedIn && todayAtt.checkInTime && clientClock) {
    const endMs = todayAtt.checkOutTime
      ? new Date(todayAtt.checkOutTime).getTime()
      : clientClock.getTime();
    const diffMs = Math.max(0, endMs - new Date(todayAtt.checkInTime).getTime());
    liveElapsed = `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`;
  }

  const kpiCards = [
    {
      label: "Today's Attendance",
      value: String(kpis.todayAttendanceStatus || 'NOT_CHECKED_IN').replace(/_/g, ' '),
      sub: isCheckedIn
        ? `Checked in at ${new Date(todayAtt.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Ready for check-in',
      icon: UserCheck,
      accent: isCheckedIn ? 'text-[#12B886] bg-emerald-50 dark:bg-emerald-950/40' : 'text-[#F59E0B] bg-amber-50 dark:bg-amber-950/40',
      href: '/employee/attendance',
    },
    {
      label: 'Total Working Hours',
      value: `${kpis.todayWorkingHours}h today`,
      sub: `${kpis.monthlyWorkingHours} hrs this month`,
      icon: Clock,
      accent: 'text-[#6538ED] bg-[#F6F5FF] dark:bg-[#191C3A]',
      href: '/attendance/my-history',
    },
    {
      label: 'Monthly Attendance',
      value: `${kpis.monthlyAttendancePercentage}%`,
      sub: `${kpis.presentDays} of ${kpis.scheduledWorkingDays} working days`,
      icon: Award,
      accent: 'text-[#12B886] bg-emerald-50 dark:bg-emerald-950/40',
      href: '/attendance/my-history',
    },
    {
      label: 'Available Leave Balance',
      value: `${kpis.availableLeaveBalance} Days`,
      sub: `${leaves.balances?.length || 0} active leave categories`,
      icon: CalendarPlus,
      accent: 'text-[#8255FF] bg-purple-50 dark:bg-purple-950/40',
      href: '/leaves',
    },
    {
      label: 'Assigned Tasks',
      value: `${kpis.pendingTasksCount} Pending`,
      sub: `${kpis.completedTasksCount} completed of ${kpis.assignedTasksCount}`,
      icon: CheckSquare,
      accent: 'text-[#F59E0B] bg-amber-50 dark:bg-amber-950/40',
      href: '/employee/tasks',
    },
    {
      label: 'Field Visits',
      value: fieldSales.isAuthorized ? `${kpis.fieldVisitsToday} Today` : 'N/A',
      sub: fieldSales.isAuthorized
        ? `${kpis.fieldVisitsTotal} total logged visits`
        : 'Back-office assignment',
      icon: Store,
      accent: 'text-[#6538ED] bg-[#F6F5FF] dark:bg-[#191C3A]',
      href: fieldSales.isAuthorized ? '/field-sales/mobile' : '/employee/team',
    },
  ];

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. PERSONALIZED EMPLOYEE DASHBOARD HEADER
          ===================================================================== */}
      <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-[#F6F5FF]/70 to-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:from-[#15172B] dark:via-[#191C38] dark:to-[#15172B]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative group shrink-0 self-start sm:self-auto">
              <div className="h-20 w-20 rounded-3xl overflow-hidden border-2 border-[#6538ED] shadow-md bg-[#F6F5FF] flex items-center justify-center dark:bg-slate-800">
                {profile.profilePhoto || user?.profilePhoto ? (
                  <img
                    src={profile.profilePhoto || user?.profilePhoto || ''}
                    alt={profile.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-black text-[#6538ED]">
                    {profile.firstName?.[0]}
                    {profile.lastName?.[0]}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOwnPhotoOpen(true)}
                title="Add or update your professional profile photo"
                aria-label="Add or update your professional profile photo"
                className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#6538ED] text-white shadow-lg hover:bg-[#562BD4] transition"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#6538ED]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#6538ED] dark:text-purple-300">
                  <Sparkles className="h-3 w-3" />
                  {formattedDate}
                </span>
                <StatusBadge status={profile.employmentStatus} />
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {profile.employeeCode}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#15172B] dark:text-white">
                {greetingText}, {profile.firstName}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Here&apos;s your work overview for today —{' '}
                <span className="font-semibold text-slate-800 dark:text-white">{profile.designation}</span>
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-[#6538ED]" />
                  {profile.department?.name || 'Operations'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#6538ED]" />
                  {profile.branch?.name || 'Headquarters'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-[#6538ED]" />
                  Reports to:{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {profile.manager
                      ? `${profile.manager.firstName} ${profile.manager.lastName}`
                      : 'Executive Management'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setIsOwnPhotoOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#6538ED]/30 bg-white px-3.5 py-2 text-xs font-bold text-[#6538ED] shadow-xs hover:bg-[#F6F5FF] dark:border-[#6538ED]/40 dark:bg-slate-800 dark:text-purple-300"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{profile.profilePhoto ? 'Update My Photo' : 'Add Own Photo'}</span>
            </button>
            <Link
              href="/employee/attendance"
              className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>My Attendance &amp; Punch</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. QUICK ACTIONS BAR
          ===================================================================== */}
      <section className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsLeaveModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#6538ED] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#562BD4] transition"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          <span>Apply for Leave</span>
        </button>
        <Link
          href="/employee/attendance"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#6538ED] hover:text-[#6538ED] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
        >
          <Clock className="h-3.5 w-3.5 text-[#6538ED]" />
          <span>View Attendance</span>
        </Link>
        <Link
          href="/shifts"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#6538ED] hover:text-[#6538ED] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
        >
          <Hourglass className="h-3.5 w-3.5 text-[#12B886]" />
          <span>View Schedule</span>
        </Link>
        {fieldSales.isAuthorized && (
          <Link
            href="/field-sales/mobile"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#6538ED] hover:text-[#6538ED] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
          >
            <Store className="h-3.5 w-3.5 text-[#8255FF]" />
            <span>Log Field Visit</span>
          </Link>
        )}
        <Link
          href="/employee/documents"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#6538ED] hover:text-[#6538ED] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
        >
          <FileText className="h-3.5 w-3.5 text-[#F59E0B]" />
          <span>View Payslip &amp; Docs</span>
        </Link>
        <Link
          href="/employee/profile"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#6538ED] hover:text-[#6538ED] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
        >
          <User className="h-3.5 w-3.5 text-slate-500" />
          <span>Update Profile</span>
        </Link>
      </section>

      {/* =====================================================================
          3. SIX KPI SUMMARY CARDS
          ===================================================================== */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="enterprise-card group p-4 hover:border-[#6538ED]/50 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                  {card.value}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {card.sub}
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      {/* =====================================================================
          4. TODAY'S ATTENDANCE OVERVIEW + TODAY'S SHIFT
          ===================================================================== */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Today's Attendance Widget (uses shared attendance backend & GPS) */}
        <div className="lg:col-span-7 enterprise-card p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#6538ED]" />
                <span>Today&apos;s Attendance Overview</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formattedDate} •{' '}
                <span className="font-mono font-semibold text-[#6538ED]">
                  {clientClock ? clientClock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={todayAtt.attendanceStatus} />
              <Link
                href="/employee/attendance"
                className="text-xs font-bold text-[#6538ED] hover:underline whitespace-nowrap"
              >
                Punch Console →
              </Link>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-2xl border p-3 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                  : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-2xl bg-[#F6F5FF] p-4 dark:bg-slate-800/50">
            <div>
              <span className="text-[11px] font-medium text-slate-400">Check-In Time</span>
              <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                {todayAtt.checkInTime
                  ? new Date(todayAtt.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400">Check-Out Time</span>
              <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                {todayAtt.checkOutTime
                  ? new Date(todayAtt.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400">Working Hours</span>
              <p className="mt-0.5 text-sm font-bold text-[#6538ED] dark:text-[#8255FF]">
                {isCheckedOut ? `${todayAtt.totalWorkingHours}h` : isCheckedIn ? liveElapsed : '0h 0m'}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400">Break Duration</span>
              <p className="mt-0.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                {todayAtt.breakDurationMinutes || 0} min
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400">Location Verification</span>
              <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                {String(todayAtt.locationVerificationStatus || '').replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400">Approval Status</span>
              <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                {String(todayAtt.approvalStatus || '').replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Live GPS Verification Strip + Actions */}
          <GPSStatusBadge
            officeLat={shiftOverview.officeLocation?.latitude ?? shiftOverview.branch?.latitude ?? 28.6139}
            officeLon={shiftOverview.officeLocation?.longitude ?? shiftOverview.branch?.longitude ?? 77.209}
            allowedRadiusMeters={shiftOverview.officeLocation?.radiusMeters ?? shiftOverview.branch?.radiusMeters ?? 100}
            officeName={shiftOverview.officeLocation?.name || shiftOverview.branch?.name || 'Headquarters'}
            onLocationUpdate={(loc) => setCurrentGps(loc)}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            {!isCheckedIn ? (
              <button
                type="button"
                disabled={submitting}
                onClick={openCheckIn}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6538ED] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[#562BD4] disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                <span>{submitting ? 'Checking In...' : 'Check In Now'}</span>
              </button>
            ) : !isCheckedOut ? (
              <button
                type="button"
                disabled={submitting}
                onClick={openCheckOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#EF476F] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-600 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                <span>{submitting ? 'Checking Out...' : 'Check Out'}</span>
              </button>
            ) : (
              <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-3 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Shift Completed ({todayAtt.totalWorkingHours} hrs)</span>
              </div>
            )}

            {isCheckedIn && !isCheckedOut && (
              <button
                type="button"
                disabled={breakLoading}
                onClick={() => toggleBreak(Boolean(todayAtt.activeBreak))}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition ${
                  todayAtt.activeBreak
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <Coffee className="h-4 w-4 text-amber-600" />
                <span>{breakLoading ? 'Updating...' : todayAtt.activeBreak ? 'End Break' : 'Start Break'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Today's Shift & Weekly Schedule */}
        <div className="lg:col-span-5 enterprise-card p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-[#6538ED]" />
                  <span>Today&apos;s Shift &amp; Schedule</span>
                </h2>
                <p className="text-xs text-slate-500">Assigned shift rules and work location</p>
              </div>
              <Link
                href="/shifts"
                className="text-xs font-bold text-[#6538ED] hover:underline whitespace-nowrap"
              >
                View Full Schedule →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-[11px] text-slate-400">Assigned Shift</span>
                <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{shiftOverview.shift?.name}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-[11px] text-slate-400">Shift Timing</span>
                <p className="mt-0.5 font-bold text-[#6538ED]">
                  {shiftOverview.shift?.startTime} – {shiftOverview.shift?.endTime}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-[11px] text-slate-400">Grace / Break Allowance</span>
                <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                  {shiftOverview.shift?.gracePeriodMinutes ?? 15}m grace • 60m break
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-[11px] text-slate-400">Assigned Work Location</span>
                <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200 truncate">
                  {shiftOverview.officeLocation?.name || shiftOverview.branch?.name || 'Headquarters'}
                </p>
              </div>
            </div>

            {/* Weekly Schedule 7-day strip */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                7-Day Schedule ({shiftOverview.weeklyOff} Weekly Off)
              </p>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {(shiftOverview.weeklySchedule || []).map((day: any) => (
                  <div
                    key={day.date}
                    className={`rounded-xl p-2 border text-[10px] ${
                      day.isOff || day.isHoliday
                        ? 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <p className="font-bold">{day.day}</p>
                    <p className="text-[9px] text-slate-400">{day.date.slice(5)}</p>
                    <p className="mt-1 font-semibold truncate">
                      {day.isHoliday ? 'Holiday' : day.isOff ? 'Off' : shiftOverview.shift?.startTime}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/shifts"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#6538ED]/25 bg-[#F6F5FF] py-2.5 text-xs font-bold text-[#6538ED] hover:bg-[#EDE9FE] dark:bg-[#191C3A] dark:text-purple-300 transition"
          >
            <span>View Full Schedule &amp; Shift Swaps</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* =====================================================================
          5. LEAVE BALANCE + ATTENDANCE ANALYTICS CHARTS
          ===================================================================== */}
      <section className="enterprise-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#6538ED]" />
              <span>Leave Balance &amp; Quotas</span>
            </h2>
            <p className="text-xs text-slate-500">
              Individual leave categories showing allocated, used, remaining, and pending request days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/leaves" className="text-xs font-bold text-slate-600 hover:text-[#6538ED] dark:text-slate-300">
              Manage Requests
            </Link>
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>

        {leaves.balances.length === 0 ? (
          <EmptyState
            title="No leave categories allocated yet"
            description="Configured annual, casual, sick, and compensatory leave quotas will display here once allocated by HR."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {leaves.balances.map((bal: any) => (
              <div
                key={bal.id}
                className="rounded-2xl border border-slate-200/80 bg-[#F6F5FF]/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{bal.name}</span>
                  <span className="rounded-md bg-[#6538ED]/10 px-2 py-0.5 text-[10px] font-bold text-[#6538ED]">
                    {bal.code}
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-[#15172B] dark:text-white">
                  {bal.remainingDays} <span className="text-xs font-medium text-slate-400">days left</span>
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 dark:border-slate-700 pt-2">
                  <span>Allocated: <strong>{bal.totalQuota}</strong></span>
                  <span>Used: <strong>{bal.usedDays}</strong></span>
                  <span>Pending: <strong className="text-amber-600">{bal.pendingDays}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <EmployeeAttendanceAnalytics
        analytics={analytics}
        selectedMonth={selectedMonth || analytics.month}
        onMonthChange={(m) => {
          setSelectedMonth(m);
          fetchDashboard(m);
        }}
      />

      {/* =====================================================================
          6. MY TASKS & ACTIVITIES + FIELD SALES & VISITS
          ===================================================================== */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Tasks */}
        <div className={`${fieldSales.isAuthorized ? 'lg:col-span-7' : 'lg:col-span-12'} enterprise-card p-5 sm:p-6 space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-[#6538ED]" />
                <span>My Tasks &amp; Activities</span>
              </h2>
              <p className="text-xs text-slate-500">Update task progress, review assignments, and track due dates</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/employee/tasks" className="text-xs font-bold text-[#6538ED] hover:underline">
                View All Tasks →
              </Link>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl bg-[#6538ED] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#562BD4]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <EmptyState
              title="No assigned tasks yet"
              description="Tasks assigned by your manager or personal goals you create appear here."
              actionLabel="Create First Task"
              onAction={() => setIsTaskModalOpen(true)}
            />
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {tasks.slice(0, 6).map((t: any) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-200/80 p-3.5 hover:border-[#6538ED]/40 transition dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTask(t)}
                        className="text-xs font-bold text-slate-900 dark:text-white hover:text-[#6538ED] text-left"
                      >
                        {t.title}
                      </button>
                      <StatusBadge status={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                    {t.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      Assigned by {t.assignedByName} •{' '}
                      {t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : 'No due date'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      aria-label={`Change status for ${t.title}`}
                      value={t.status}
                      onChange={(e) => handleTaskStatusUpdate(t.id, e.target.value as any)}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Field Sales & Visits (only when authorized) */}
        {fieldSales.isAuthorized && (
          <div className="lg:col-span-5 enterprise-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#6538ED]" />
                  <span>Field Sales &amp; Visits</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {fieldSales.todayCount} today • {fieldSales.completedCount} submitted • {fieldSales.pendingCount} pending
                </p>
              </div>
              <Link
                href="/field-sales/mobile"
                className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Field Visit</span>
              </Link>
            </div>

            {fieldSales.visits.length === 0 ? (
              <EmptyState
                title="No field visits logged yet"
                description="Start a GPS-verified shop visit to record retailer orders and visit evidence."
                actionLabel="Open Field Sales App"
                onAction={() => {
                  window.location.href = '/field-sales/mobile';
                }}
              />
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {fieldSales.visits.slice(0, 5).map((v: any) => (
                  <div
                    key={v.id}
                    className="rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {v.retailerName}
                      </span>
                      <StatusBadge status={v.submissionStatus} />
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {v.retailerAddress || v.retailerCity || 'Retail outlet'} • {v.visitDate}
                    </p>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        GPS: <strong className="text-[#12B886]">{v.locationVerificationStatus.replace(/_/g, ' ')}</strong>
                      </span>
                      <span className="font-mono text-slate-400">{v.visitId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* =====================================================================
          7. ANNOUNCEMENTS + RECENT ACTIVITY + MY DOCUMENTS
          ===================================================================== */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Announcements */}
        <div className="lg:col-span-4 enterprise-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-[#6538ED]" />
                <span>Announcements</span>
              </h2>
              <p className="text-xs text-slate-500">Company, branch &amp; holiday notices</p>
            </div>
            {isElevatedAnnouncer && (
              <button
                type="button"
                onClick={() => setIsAnnounceModalOpen(true)}
                className="rounded-xl border border-[#6538ED]/30 px-2.5 py-1 text-[11px] font-bold text-[#6538ED] hover:bg-[#F6F5FF]"
              >
                + Post
              </button>
            )}
          </div>

          {announcements.length === 0 ? (
            <EmptyState
              title="No active announcements"
              description="Company policies, branch updates, and holiday reminders will appear here."
            />
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {announcements.map((a: any) => (
                <div
                  key={a.id}
                  className={`rounded-2xl border p-3.5 space-y-1.5 transition ${
                    a.isRead
                      ? 'border-slate-200/80 dark:border-slate-800'
                      : 'border-[#6538ED]/40 bg-[#F6F5FF]/70 dark:bg-[#191C3A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-[#6538ED]/10 px-2 py-0.5 text-[10px] font-bold text-[#6538ED]">
                      {a.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(a.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">{a.title}</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{a.description}</p>
                  {!a.isSystemHoliday && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleAnnouncementRead(a.id, a.isRead)}
                        className="text-[10px] font-bold text-[#6538ED] hover:underline"
                      >
                        {a.isRead ? 'Mark Unread' : 'Mark as Read'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-4 enterprise-card p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#12B886]" />
              <span>Recent Activity</span>
            </h2>
            <p className="text-xs text-slate-500">Your personal chronological audit timeline</p>
          </div>

          {recentActivity.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="Attendance punches, breaks, leaves, tasks, and profile updates appear here."
            />
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {recentActivity.map((act: any) => (
                <div key={act.id} className="flex items-start gap-2.5 border-b border-slate-100 pb-2.5 last:border-0 dark:border-slate-800">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#6538ED] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{act.title}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(act.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{act.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Documents */}
        <div className="lg:col-span-4 enterprise-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#F59E0B]" />
                <span>My Documents</span>
              </h2>
              <p className="text-xs text-slate-500">Private payslips &amp; employment letters</p>
            </div>
            <Link href="/employee/documents" className="text-xs font-bold text-[#6538ED] hover:underline">
              All Docs →
            </Link>
          </div>

          <div className="space-y-2.5">
            <a
              href={docs.appointmentLetterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl border border-[#6538ED]/25 bg-[#F6F5FF] p-3 hover:bg-[#EDE9FE] transition dark:bg-[#191C3A]"
            >
              <div>
                <p className="text-xs font-bold text-[#15172B] dark:text-white">Official Appointment Letter</p>
                <p className="text-[10px] text-slate-500">Verified HR Employment PDF</p>
              </div>
              <Download className="h-4 w-4 text-[#6538ED]" />
            </a>

            {(docs.payslips || []).slice(0, 3).map((p: any) => (
              <a
                key={p.id}
                href={p.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 hover:border-[#6538ED]/40 transition dark:border-slate-800"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    Payslip {p.month}/{p.year}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {p.payslipNumber} • Net ₹{Number(p.netSalary || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <Download className="h-4 w-4 text-slate-400" />
              </a>
            ))}

            {(docs.files || []).slice(0, 3).map((f: any) => (
              <a
                key={f.id}
                href={f.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 hover:border-[#6538ED]/40 transition dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{f.title}</p>
                  <p className="text-[10px] text-slate-400">{f.category.replace(/_/g, ' ')}</p>
                </div>
                <Download className="h-4 w-4 text-slate-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedTask.title}</h3>
              <StatusBadge status={selectedTask.status} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedTask.description || 'No detailed description provided.'}
            </p>
            <div className="rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300 space-y-1">
              <p><strong>Priority:</strong> {selectedTask.priority}</p>
              <p><strong>Assigned By:</strong> {selectedTask.assignedByName}</p>
              <p><strong>Assigned Date:</strong> {new Date(selectedTask.assignedDate).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'Open'}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <LiveCameraModal
        isOpen={isCameraModalOpen}
        title={cameraModalMode === 'CHECK_IN' ? 'Check-In Live Selfie Verification' : 'Check-Out Photo Verification'}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={submitPunchPhoto}
      />

      <EmployeePhotoUploadModal
        isOpen={isOwnPhotoOpen}
        onClose={() => setIsOwnPhotoOpen(false)}
        isSelfService
        targetEmployeeId={profile.id}
        targetUserId={profile.userId}
        currentPhoto={profile.profilePhoto || null}
        employeeName={profile.fullName}
        onSave={async (photoUrl) => {
          const res = await saveOwnProfilePhoto(photoUrl);
          await refreshUser();
          await fetchDashboard();
          toast.success(
            photoUrl
              ? `Professional photo saved in folder ${res.folder || profile.id}.`
              : 'Profile photo removed.'
          );
        }}
      />

      <ApplyLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        leaveTypes={leaves.leaveTypes || []}
        balances={leaves.balances || []}
        onSuccess={() => fetchDashboard()}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => fetchDashboard()}
      />

      {isElevatedAnnouncer && (
        <PublishAnnouncementModal
          isOpen={isAnnounceModalOpen}
          onClose={() => setIsAnnounceModalOpen(false)}
          onSuccess={() => fetchDashboard()}
        />
      )}
    </div>
  );
}
