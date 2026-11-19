'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Building2,
  MapPin,
  TrendingUp,
  Download,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Radio,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Coffee,
  Laptop,
} from 'lucide-react';
import KPIDrilldownModal from '@/components/KPIDrilldownModal';
import {
  DailyAttendanceLineChart,
  PresentVsAbsentPieChart,
  DepartmentAttendanceBarChart,
  BranchAttendanceBarChart,
} from '@/components/analytics/Charts';
import { EmployeeDailyStatus } from '@/lib/analytics';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [branchData, setBranchData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Drilldown modal state
  const [drilldownModal, setDrilldownModal] = useState<{
    isOpen: boolean;
    title: string;
    category: string;
    employees: EmployeeDailyStatus[];
  }>({
    isOpen: false,
    title: '',
    category: '',
    employees: [],
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        date: selectedDate,
        ...(selectedBranch && { branchId: selectedBranch }),
      });

      const [resOverview, resWeekly, resDept, resBranch] = await Promise.all([
        fetch(`/api/admin/dashboard/overview?${queryParams}`),
        fetch(`/api/admin/analytics/weekly?${queryParams}`),
        fetch(`/api/admin/analytics/departments?${queryParams}`),
        fetch(`/api/admin/analytics/branches?${queryParams}`),
      ]);

      if (resOverview.ok) {
        const json = await resOverview.json();
        setData(json);
      }
      if (resWeekly.ok) {
        const json = await resWeekly.json();
        setWeeklyData(json);
      }
      if (resDept.ok) {
        const json = await resDept.json();
        setDeptData(json.departments || []);
      }
      if (resBranch.ok) {
        const json = await resBranch.json();
        setBranchData(json.branches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBranch]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const allEmployees: EmployeeDailyStatus[] = data?.detailedEmployees || [];

  const handleKpiClick = (kpiKey: string, title: string) => {
    let filtered: EmployeeDailyStatus[] = [];

    switch (kpiKey) {
      case 'totalEmployees':
        filtered = allEmployees;
        break;
      case 'activeEmployees':
        filtered = allEmployees;
        break;
      case 'presentToday':
        filtered = allEmployees.filter(
          (e) => e.status === 'PRESENT' || e.status === 'LATE' || e.status === 'HALF_DAY'
        );
        break;
      case 'absentToday':
        filtered = allEmployees.filter((e) => e.status === 'ABSENT');
        break;
      case 'currentlyCheckedIn':
        filtered = allEmployees.filter((e) => e.checkInTime && !e.checkOutTime);
        break;
      case 'checkedOut':
        filtered = allEmployees.filter((e) => Boolean(e.checkOutTime));
        break;
      case 'onLeave':
        filtered = allEmployees.filter((e) => e.status === 'ON_LEAVE');
        break;
      case 'lateArrivals':
        filtered = allEmployees.filter((e) => e.lateMinutes > 0);
        break;
      case 'earlyDepartures':
        filtered = allEmployees.filter((e) => e.earlyDepartureMinutes > 0);
        break;
      case 'halfDays':
        filtered = allEmployees.filter((e) => e.status === 'HALF_DAY');
        break;
      case 'workFromHome':
        filtered = allEmployees.filter((e) => e.status === 'WORK_FROM_HOME');
        break;
      case 'pendingCorrections':
        filtered = allEmployees.filter((e) => e.status === 'PENDING_APPROVAL');
        break;
      default:
        filtered = allEmployees;
    }

    setDrilldownModal({
      isOpen: true,
      title,
      category: title,
      employees: filtered,
    });
  };

  // Keyboard activation for the clickable KPI tiles (Enter / Space)
  const handleKpiKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    kpiKey: string,
    title: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleKpiClick(kpiKey, title);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          <p className="text-xs text-slate-500">Compiling executive dashboard telemetry...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const insights = data?.insights || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Global Date/Branch Filters */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Executive HRMS Dashboard
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live DB Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time workforce presence, biometric verification, geofences, and BI analytics
          </p>
        </div>

        {/* Date, Branch & Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-medium focus:outline-none dark:text-white"
            />
          </div>

          {/* Branch Filter */}
          {branchData.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">All Branches</option>
              {branchData.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <Link
            href="/admin/attendance/live"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>Live Monitor</span>
          </Link>

          <Link
            href="/reports"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Reports</span>
          </Link>
        </div>
      </div>

      {/* Business Intelligence Insights Banner */}
      {insights.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-brand-50/50 p-4 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/80">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold tracking-wide text-indigo-900 uppercase dark:text-indigo-300">
              Automated Business Intelligence Insights
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((ins: any, idx: number) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-850"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{ins.title}</span>
                  {ins.metric && (
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {ins.metric}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{ins.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12 DYNAMIC KPI CARDS (All Clickable for Drill-down Employee List) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Workforce KPIs & Live Attendance (Click card to drill down)
          </h2>
          <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
            Attendance Rate: {kpis.attendancePercentage || 0}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {/* 1. Total Employees */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Total Registered Employees"
            onClick={() => handleKpiClick('totalEmployees', 'Total Registered Employees')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'totalEmployees', 'Total Registered Employees')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-brand-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">Total Staff</span>
              <Users className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{kpis.totalEmployees ?? 0}</p>
            <p className="mt-1 text-[10px] text-slate-400">Org-wide registered</p>
          </div>

          {/* 2. Active Employees */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Active Employees"
            onClick={() => handleKpiClick('activeEmployees', 'Active Employees')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'activeEmployees', 'Active Employees')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-brand-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase">Active Staff</span>
              <UserCheck className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.activeEmployees ?? 0}</p>
            <p className="mt-1 text-[10px] text-slate-400">Scheduled workforce</p>
          </div>

          {/* 3. Present Today */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Present Employees Today"
            onClick={() => handleKpiClick('presentToday', 'Present Employees Today')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'presentToday', 'Present Employees Today')}
            className="cursor-pointer rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs transition-all hover:border-emerald-500 hover:shadow-md dark:border-emerald-900/50 dark:bg-emerald-950/20"
          >
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
              <span className="text-[11px] font-bold uppercase">Present Today</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{kpis.presentToday ?? 0}</p>
            <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{kpis.attendancePercentage}% turn-out</p>
          </div>

          {/* 4. Absent Today */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Unexcused Absent Employees Today"
            onClick={() => handleKpiClick('absentToday', 'Unexcused Absent Employees Today')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'absentToday', 'Unexcused Absent Employees Today')}
            className="cursor-pointer rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs transition-all hover:border-rose-500 hover:shadow-md dark:border-rose-900/50 dark:bg-rose-950/20"
          >
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
              <span className="text-[11px] font-bold uppercase">Absent Today</span>
              <UserX className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300">{kpis.absentToday ?? 0}</p>
            <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">Excludes leave & holiday</p>
          </div>

          {/* 5. Currently Checked In */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Currently Checked In Employees"
            onClick={() => handleKpiClick('currentlyCheckedIn', 'Currently Checked In Employees')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'currentlyCheckedIn', 'Currently Checked In Employees')}
            className="cursor-pointer rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-xs transition-all hover:border-indigo-500 hover:shadow-md dark:border-indigo-900/50 dark:bg-indigo-950/20"
          >
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400">
              <span className="text-[11px] font-bold uppercase">Checked In</span>
              <Clock className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-300">{kpis.currentlyCheckedIn ?? 0}</p>
            <p className="mt-1 text-[10px] text-indigo-600 dark:text-indigo-400">On duty currently</p>
          </div>

          {/* 6. Checked Out */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Employees Checked Out Today"
            onClick={() => handleKpiClick('checkedOut', 'Employees Checked Out Today')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'checkedOut', 'Employees Checked Out Today')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-brand-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase">Checked Out</span>
              <LogOut className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-200">{kpis.checkedOut ?? 0}</p>
            <p className="mt-1 text-[10px] text-slate-400">Shift ended</p>
          </div>

          {/* 7. Employees on Leave */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Employees on Approved Leave Today"
            onClick={() => handleKpiClick('onLeave', 'Employees on Approved Leave Today')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'onLeave', 'Employees on Approved Leave Today')}
            className="cursor-pointer rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-xs transition-all hover:border-blue-500 hover:shadow-md dark:border-blue-900/50 dark:bg-blue-950/20"
          >
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
              <span className="text-[11px] font-bold uppercase">On Leave</span>
              <Calendar className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300">{kpis.onLeave ?? 0}</p>
            <p className="mt-1 text-[10px] text-blue-600 dark:text-blue-400">Approved time-off</p>
          </div>

          {/* 8. Late Arrivals */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Late Arrivals Today"
            onClick={() => handleKpiClick('lateArrivals', 'Late Arrivals Today')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'lateArrivals', 'Late Arrivals Today')}
            className="cursor-pointer rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs transition-all hover:border-amber-500 hover:shadow-md dark:border-amber-900/50 dark:bg-amber-950/20"
          >
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
              <span className="text-[11px] font-bold uppercase">Late Arrivals</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{kpis.lateArrivals ?? 0}</p>
            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">Past grace period</p>
          </div>

          {/* 9. Early Departures */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Early Departure Incidents Today"
            onClick={() => handleKpiClick('earlyDepartures', 'Early Departure Incidents Today')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'earlyDepartures', 'Early Departure Incidents Today')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-brand-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Early Depart</span>
              <Clock className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-200">{kpis.earlyDepartures ?? 0}</p>
            <p className="mt-1 text-[10px] text-slate-400">Left before shift end</p>
          </div>

          {/* 10. Half Days */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Half Day Workers Today"
            onClick={() => handleKpiClick('halfDays', 'Half Day Workers Today')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'halfDays', 'Half Day Workers Today')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-brand-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Half Days</span>
              <Coffee className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-200">{kpis.halfDays ?? 0}</p>
            <p className="mt-1 text-[10px] text-slate-400">&lt; 4.5 working hours</p>
          </div>

          {/* 11. Work From Home */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Remote or Work From Home Employees"
            onClick={() => handleKpiClick('workFromHome', 'Remote / Work From Home Employees')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'workFromHome', 'Remote / Work From Home Employees')}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-brand-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Remote WFH</span>
              <Laptop className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-200">{kpis.workFromHome ?? 0}</p>
            <p className="mt-1 text-[10px] text-slate-400">Offsite approved</p>
          </div>

          {/* 12. Pending Attendance Corrections */}
          <div
            role="button"
            tabIndex={0}
            aria-label="View Pending Corrections and Exceptions"
            onClick={() => handleKpiClick('pendingCorrections', 'Pending Corrections & Exceptions')}
            onKeyDown={(e) => handleKpiKeyDown(e, 'pendingCorrections', 'Pending Corrections & Exceptions')}
            className="cursor-pointer rounded-2xl border border-purple-200 bg-purple-50/40 p-4 shadow-xs transition-all hover:border-purple-500 hover:shadow-md dark:border-purple-900/50 dark:bg-purple-950/20"
          >
            <div className="flex items-center justify-between text-purple-700 dark:text-purple-400">
              <span className="text-[11px] font-bold uppercase">Pending Sign-off</span>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-purple-700 dark:text-purple-300">{kpis.pendingCorrections ?? 0}</p>
            <p className="mt-1 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Exceptions queue</p>
          </div>
        </div>
      </div>

      {/* Primary Analytics Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Trend Line Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Attendance Trend (Monday - Sunday)
              </h3>
              <p className="text-xs text-slate-400">Weekly present vs absent trajectory with late arrival alerts</p>
            </div>
            <Link href="/admin/analytics" className="text-xs font-bold text-brand-600 hover:underline">
              Deep Analytics →
            </Link>
          </div>
          <div className="mt-4">
            <DailyAttendanceLineChart data={weeklyData?.days || []} />
          </div>
        </div>

        {/* Present vs Absent Ratio Pie Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Today&apos;s Attendance Ratio</h3>
            <p className="text-xs text-slate-400">Distribution of present, absent and leave</p>
          </div>
          <div className="mt-4">
            <PresentVsAbsentPieChart
              present={kpis.presentToday || 0}
              absent={kpis.absentToday || 0}
              onLeave={kpis.onLeave || 0}
            />
          </div>
        </div>
      </div>

      {/* Department & Branch Analytics Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Department Attendance Rates */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Attendance Comparison</h3>
              <p className="text-xs text-slate-400">Real-time attendance percentage per department</p>
            </div>
            <Link href="/departments" className="text-xs font-semibold text-brand-600 hover:underline">
              Manage →
            </Link>
          </div>
          <div className="mt-4">
            <DepartmentAttendanceBarChart data={deptData} />
          </div>
        </div>

        {/* Branch-wise Workforce Breakdown */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Branch Geofence Distribution</h3>
              <p className="text-xs text-slate-400">Present vs absent across registered office locations</p>
            </div>
            <Link href="/branches" className="text-xs font-semibold text-brand-600 hover:underline">
              Branches →
            </Link>
          </div>
          <div className="mt-4">
            <BranchAttendanceBarChart data={branchData} />
          </div>
        </div>
      </div>

      {/* Drilldown Modal for clicked KPI */}
      <KPIDrilldownModal
        isOpen={drilldownModal.isOpen}
        title={drilldownModal.title}
        category={drilldownModal.category}
        employees={drilldownModal.employees}
        onClose={() => setDrilldownModal({ ...drilldownModal, isOpen: false })}
      />
    </div>
  );
}
