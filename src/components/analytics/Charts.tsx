'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'];

function downloadChartDataCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map((d) => keys.map((k) => `"${d[k] ?? ''}"`).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// 1. Daily Attendance Line Chart
export function DailyAttendanceLineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No daily attendance data available</div>;
  }

  return (
    <div className="relative">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => downloadChartDataCSV(data, 'daily_attendance_trend')}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <Download className="h-3 w-3" /> Export CSV
        </button>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" name="Present" strokeWidth={2} />
            <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" />
            <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 2. Monthly Attendance Bar Chart
export function MonthlyAttendanceBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No monthly data available</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Bar dataKey="presentDays" fill="#10b981" name="Present Days" radius={[4, 4, 0, 0]} />
          <Bar dataKey="absentDays" fill="#ef4444" name="Absent Days" radius={[4, 4, 0, 0]} />
          <Bar dataKey="leaveDays" fill="#6366f1" name="Leave Days" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 3. Present vs Absent Pie Chart
export function PresentVsAbsentPieChart({
  present,
  absent,
  onLeave,
}: {
  present: number;
  absent: number;
  onLeave: number;
}) {
  const pieData = [
    { name: 'Present', value: present, color: '#10b981' },
    { name: 'Absent', value: absent, color: '#ef4444' },
    { name: 'On Leave', value: onLeave, color: '#6366f1' },
  ].filter((p) => p.value > 0);

  if (pieData.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No attendance records today</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            label={({ name, percent }: any) => `${name} ${(((percent || 0) * 100)).toFixed(0)}%`}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// 4. Department-wise Attendance Chart
export function DepartmentAttendanceBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No department data available</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
            formatter={(value: any) => [`${value}%`, 'Attendance Rate']}
          />
          <Bar dataKey="attendancePercentage" fill="#6366f1" name="Attendance %" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 5. Branch-wise Attendance Chart
export function BranchAttendanceBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No branch data available</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="presentEmployees" fill="#10b981" name="Present" radius={[4, 4, 0, 0]} />
          <Bar dataKey="absentEmployees" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
          <Bar dataKey="lateArrivals" fill="#f59e0b" name="Late Arrivals" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 6. Late Arrival Trend Chart
export function LateArrivalTrendChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No late arrival trends</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
          />
          <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Late Arrivals" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// 7. Overtime Analysis Chart
export function OvertimeAnalysisChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No overtime data recorded</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
            formatter={(val: any) => [`${val} hrs`, 'Overtime Hours']}
          />
          <Bar dataKey="overtimeHours" fill="#8b5cf6" name="Overtime (Hours)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 8. Leave Utilization Chart
export function LeaveUtilizationChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No leave records</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="leaveDays" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} name="Leave Days Utilized" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// 9. Employee Attendance Ranking Chart
export function EmployeeRankingBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-400">No ranking data</div>;
  }

  const top10 = data.slice(0, 10);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
            formatter={(val: any) => [`${val}%`, 'Attendance Rate']}
          />
          <Bar dataKey="attendancePercentage" fill="#10b981" name="Attendance %" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 10. Attendance Percentage Comparison Chart (Current vs Previous Week)
export function AttendanceComparisonChart({
  currentPct,
  previousPct,
}: {
  currentPct: number;
  previousPct: number;
}) {
  const comparisonData = [
    { period: 'Previous Week', percentage: previousPct, fill: '#94a3b8' },
    { period: 'Current Week', percentage: currentPct, fill: '#10b981' },
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={comparisonData} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 'bold' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
            formatter={(val: any) => [`${val}%`, 'Attendance Rate']}
          />
          <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
            {comparisonData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
