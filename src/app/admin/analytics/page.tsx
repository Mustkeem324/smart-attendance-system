'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Building2,
  MapPin,
  TrendingUp,
  Users,
  Award,
  Sparkles,
  Download,
  Filter,
  UserCheck,
  UserX,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  DailyAttendanceLineChart,
  MonthlyAttendanceBarChart,
  PresentVsAbsentPieChart,
  DepartmentAttendanceBarChart,
  BranchAttendanceBarChart,
  LateArrivalTrendChart,
  OvertimeAnalysisChart,
  LeaveUtilizationChart,
  EmployeeRankingBarChart,
  AttendanceComparisonChart,
} from '@/components/analytics/Charts';

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'DEPARTMENTS' | 'BRANCHES' | 'EMPLOYEES' | 'LIFECYCLE' | 'BI'>('OVERVIEW');

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Data states
  const [dailyData, setDailyData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [yearlyData, setYearlyData] = useState<any>(null);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [branchData, setBranchData] = useState<any[]>([]);
  const [employeeRanking, setEmployeeRanking] = useState<any[]>([]);
  const [lifecycleData, setLifecycleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selected department for drilldown
  const [selectedDeptDetail, setSelectedDeptDetail] = useState<any | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [rDaily, rWeekly, rMonthly, rYearly, rDept, rBranch, rEmp, rLife] = await Promise.all([
        fetch(`/api/admin/analytics/daily?date=${selectedDate}`),
        fetch(`/api/admin/analytics/weekly?date=${selectedDate}`),
        fetch(`/api/admin/analytics/monthly?year=${selectedYear}&month=${selectedMonth}`),
        fetch(`/api/admin/analytics/yearly?year=${selectedYear}`),
        fetch(`/api/admin/analytics/departments?date=${selectedDate}`),
        fetch(`/api/admin/analytics/branches?date=${selectedDate}`),
        fetch(`/api/admin/analytics/employees?year=${selectedYear}&month=${selectedMonth}`),
        fetch(`/api/admin/analytics/joinings`),
      ]);

      if (rDaily.ok) setDailyData(await rDaily.json());
      if (rWeekly.ok) setWeeklyData(await rWeekly.json());
      if (rMonthly.ok) setMonthlyData(await rMonthly.json());
      if (rYearly.ok) setYearlyData(await rYearly.json());
      if (rDept.ok) {
        const dJson = await rDept.json();
        setDeptData(dJson.departments || []);
      }
      if (rBranch.ok) {
        const bJson = await rBranch.json();
        setBranchData(bJson.branches || []);
      }
      if (rEmp.ok) {
        const eJson = await rEmp.json();
        setEmployeeRanking(eJson.employeeRanking || []);
      }
      if (rLife.ok) setLifecycleData(await rLife.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Enterprise Attendance Analytics
            </h1>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              Interactive BI
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comprehensive attendance forecasting, department benchmarks, overtime analysis, and retention metrics
          </p>
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-medium focus:outline-none dark:text-white"
            />
          </div>

          <Link
            href="/reports"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Generate Reports</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2 dark:border-slate-800">
        {[
          { id: 'OVERVIEW', label: 'Daily & Real-Time' },
          { id: 'WEEKLY', label: 'Weekly Trends' },
          { id: 'MONTHLY', label: 'Monthly Deep Dive' },
          { id: 'YEARLY', label: 'Annual Analytics' },
          { id: 'DEPARTMENTS', label: 'Department Ratios' },
          { id: 'BRANCHES', label: 'Branch Geofences' },
          { id: 'EMPLOYEES', label: 'Employee Rankings' },
          { id: 'LIFECYCLE', label: 'Joining & Retention' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DAILY & OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Daily Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Scheduled</span>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{dailyData?.scheduledEmployees ?? 0}</p>
              <p className="mt-1 text-[10px] text-slate-400">Total expected today</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Present</span>
              <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{dailyData?.presentEmployees ?? 0}</p>
              <p className="mt-1 text-[10px] text-emerald-600 font-semibold">{dailyData?.attendancePercentage}% rate</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">Absent</span>
              <p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300">{dailyData?.absentEmployees ?? 0}</p>
              <p className="mt-1 text-[10px] text-rose-600 font-medium">Unexcused</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">On Leave</span>
              <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300">{dailyData?.approvedLeave ?? 0}</p>
              <p className="mt-1 text-[10px] text-blue-600">Approved leaves</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">Late Arrivals</span>
              <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{dailyData?.lateArrivals ?? 0}</p>
              <p className="mt-1 text-[10px] text-amber-600">Grace period breach</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Half Days</span>
              <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-200">{dailyData?.halfDays ?? 0}</p>
              <p className="mt-1 text-[10px] text-slate-400">&lt; 4.5 hours</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Presence Distribution</h3>
              <p className="text-xs text-slate-400">Ratio of present vs absent vs authorized leaves</p>
              <div className="mt-4">
                <PresentVsAbsentPieChart
                  present={dailyData?.presentEmployees || 0}
                  absent={dailyData?.absentEmployees || 0}
                  onLeave={dailyData?.approvedLeave || 0}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Weekly Trajectory</h3>
              <p className="text-xs text-slate-400">7-day performance curve</p>
              <div className="mt-4">
                <DailyAttendanceLineChart data={weeklyData?.days || []} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY ANALYTICS */}
      {activeTab === 'WEEKLY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Current Week Average</span>
              <p className="mt-2 text-3xl font-black text-emerald-600">{weeklyData?.weeklyAveragePercentage ?? 0}%</p>
              <p className="mt-1 text-xs text-slate-400">Mon - Sun cumulative presence</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Previous Week Average</span>
              <p className="mt-2 text-3xl font-black text-slate-600 dark:text-slate-300">{weeklyData?.previousWeekAveragePercentage ?? 0}%</p>
              <p className="mt-1 text-xs text-slate-400">Prior 7-day period</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Week-on-Week Change</span>
              <p className={`mt-2 text-3xl font-black ${
                (weeklyData?.weekOnWeekChangePercentage || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {(weeklyData?.weekOnWeekChangePercentage || 0) >= 0 ? '+' : ''}
                {weeklyData?.weekOnWeekChangePercentage ?? 0}%
              </p>
              <p className="mt-1 text-xs text-slate-400">Operational momentum</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Week-on-Week Attendance Comparison</h3>
              <p className="text-xs text-slate-400">Objective comparison of presence ratios</p>
              <div className="mt-4">
                <AttendanceComparisonChart
                  currentPct={weeklyData?.weeklyAveragePercentage || 0}
                  previousPct={weeklyData?.previousWeekAveragePercentage || 0}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Late Arrival Trends</h3>
              <p className="text-xs text-slate-400">Punctuality breaches across the week</p>
              <div className="mt-4">
                <LateArrivalTrendChart data={weeklyData?.days || []} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY DEEP DIVE */}
      {activeTab === 'MONTHLY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Working Days</span>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{monthlyData?.workingDays ?? 0}</p>
              <p className="mt-1 text-[10px] text-slate-400">Scheduled days</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Monthly Attendance</span>
              <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{monthlyData?.monthlyAttendancePercentage ?? 0}%</p>
              <p className="mt-1 text-[10px] text-emerald-600 font-semibold">Weighted presence</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Present Days</span>
              <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-200">{monthlyData?.totalPresentDays ?? 0}</p>
              <p className="mt-1 text-[10px] text-slate-400">Cumulative punches</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Leave Days</span>
              <p className="mt-2 text-2xl font-black text-blue-600">{monthlyData?.totalLeaveDays ?? 0}</p>
              <p className="mt-1 text-[10px] text-slate-400">Approved leaves</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Late Incidents</span>
              <p className="mt-2 text-2xl font-black text-amber-600">{monthlyData?.totalLateArrivals ?? 0}</p>
              <p className="mt-1 text-[10px] text-slate-400">Monthly tardiness</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Overtime Hours</span>
              <p className="mt-2 text-2xl font-black text-indigo-600">{monthlyData?.totalOvertimeHours ?? 0}h</p>
              <p className="mt-1 text-[10px] text-slate-400">Extended shifts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Attendance Percentage</h3>
              <p className="text-xs text-slate-400">Day-by-day attendance rate across the month</p>
              <div className="mt-4">
                <DailyAttendanceLineChart data={monthlyData?.dailyTrends || []} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Employee Performance Ranking</h3>
              <p className="text-xs text-slate-400">Top workforce attendance percentages</p>
              <div className="mt-4">
                <EmployeeRankingBarChart data={monthlyData?.employeeStats || []} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANNUAL ANALYTICS */}
      {activeTab === 'YEARLY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Annual Attendance Rate</span>
              <p className="mt-2 text-3xl font-black text-emerald-600">{yearlyData?.annualAttendancePercentage ?? 0}%</p>
              <p className="mt-1 text-xs text-slate-400">12-month consolidated presence</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Annual Overtime Hours</span>
              <p className="mt-2 text-3xl font-black text-indigo-600">{yearlyData?.totalAnnualOvertimeHours ?? 0} hrs</p>
              <p className="mt-1 text-xs text-slate-400">Cumulative extended working hours</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Annual Leave Days</span>
              <p className="mt-2 text-3xl font-black text-blue-600">{yearlyData?.totalAnnualLeaveDays ?? 0} days</p>
              <p className="mt-1 text-xs text-slate-400">Authorized absences</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">12-Month Monthly Attendance</h3>
              <p className="text-xs text-slate-400">Present vs absent days across the full calendar year</p>
              <div className="mt-4">
                <MonthlyAttendanceBarChart data={yearlyData?.months || []} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Annual Overtime Distribution</h3>
              <p className="text-xs text-slate-400">Monthly overtime trends</p>
              <div className="mt-4">
                <OvertimeAnalysisChart data={yearlyData?.months || []} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DEPARTMENTS */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Attendance Benchmarking</h3>
              <p className="text-xs text-slate-400">Percentage attendance per department today</p>
              <div className="mt-4">
                <DepartmentAttendanceBarChart data={deptData} />
              </div>
            </div>

            {/* Department Summary Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase">Departments List (Click to view employees)</h3>
              {deptData.map((d) => (
                <div
                  key={d.departmentId}
                  onClick={() => setSelectedDeptDetail(d)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    selectedDeptDetail?.departmentId === d.departmentId
                      ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{d.name}</span>
                    <span className="text-xs font-extrabold text-brand-600">{d.attendancePercentage}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{d.totalEmployees} Staff</span>
                    <span>{d.presentEmployees} Present</span>
                    <span>{d.absentEmployees} Absent</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Drilldown Table */}
          {selectedDeptDetail && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedDeptDetail.name} — Employee Attendance Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedDeptDetail.totalEmployees} employees • {selectedDeptDetail.presentEmployees} present today
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDeptDetail(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3">Branch</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedDeptDetail.employees.map((e: any) => (
                      <tr key={e.employeeId}>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{e.name}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{e.designation}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{e.branchName}</td>
                        <td className="py-2.5 px-3">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {e.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">{e.totalHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: BRANCHES */}
      {activeTab === 'BRANCHES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Branch-wise Attendance Breakdown</h3>
              <p className="text-xs text-slate-400">Present vs absent across physical office locations</p>
              <div className="mt-4">
                <BranchAttendanceBarChart data={branchData} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase">Registered Branch Locations & Geofences</h3>
              {branchData.map((b) => (
                <div
                  key={b.branchId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{b.name}</h4>
                        <p className="text-[11px] text-slate-400">{b.address}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {b.attendancePercentage}% Present
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 text-center text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400">Total Staff</span>
                      <p className="font-bold text-slate-900 dark:text-white">{b.totalEmployees}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Present</span>
                      <p className="font-bold text-emerald-600">{b.presentEmployees}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Geofence</span>
                      <p className="font-bold text-indigo-600">{b.radiusMeters}m radius</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: EMPLOYEES */}
      {activeTab === 'EMPLOYEES' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workforce Attendance Leaderboard</h3>
            <p className="text-xs text-slate-400">Objective ranking based on present days and punctuality</p>
            <div className="mt-4">
              <EmployeeRankingBarChart data={employeeRanking} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: LIFECYCLE (JOININGS & EXITS) */}
      {activeTab === 'LIFECYCLE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Joined This Month</span>
              <p className="mt-2 text-3xl font-black text-emerald-600">{lifecycleData?.joinedThisMonth ?? 0}</p>
              <p className="mt-1 text-xs text-slate-400">New onboarding</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Joined This Year</span>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{lifecycleData?.joinedThisYear ?? 0}</p>
              <p className="mt-1 text-xs text-slate-400">Annual additions</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Resignations</span>
              <p className="mt-2 text-3xl font-black text-rose-600">{lifecycleData?.resignedTotal ?? 0}</p>
              <p className="mt-1 text-xs text-slate-400">Total departures</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase">Retention Rate</span>
              <p className="mt-2 text-3xl font-black text-indigo-600">{lifecycleData?.retentionRate ?? 100}%</p>
              <p className="mt-1 text-xs text-slate-400">Active tenure stability</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
