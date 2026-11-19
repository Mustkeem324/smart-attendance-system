'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CalendarDays,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  Check,
  Palmtree,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export default function LeavesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'approvals' | 'calendar' | 'policies'>('requests');

  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [calendarLeaves, setCalendarLeaves] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'FIRST_HALF',
  });

  const isElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER'].includes(user.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leavesRes, calendarRes, typesRes] = await Promise.all([
        fetch('/api/leaves'),
        fetch('/api/leaves/calendar'),
        fetch('/api/admin/leave-types'),
      ]);

      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setRequests(data.requests || []);
        setBalances(data.balances || []);
        if (data.leaveTypes?.[0]) {
          setForm((prev) => (prev.leaveTypeId ? prev : { ...prev, leaveTypeId: data.leaveTypes[0].id }));
        }
      }

      if (calendarRes.ok) {
        const cal = await calendarRes.json();
        setCalendarLeaves(cal.leaves || []);
        setHolidays(cal.holidays || []);
      }

      if (typesRes.ok) {
        const lt = await typesRes.json();
        setLeaveTypes(lt.leaveTypes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await fetch('/api/leaves/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setIsApplyModalOpen(false);
        setFeedback(`Leave submitted successfully! Calculated working days deducted: ${data.calculation?.deductibleDays ?? 1}`);
        setForm({
          leaveTypeId: leaveTypes[0]?.id || '',
          startDate: '',
          endDate: '',
          reason: '',
          isHalfDay: false,
          halfDayPeriod: 'FIRST_HALF',
        });
        fetchData();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const handleCancelLeave = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this leave request? Days will be refunded.')) return;
    try {
      const res = await fetch(`/api/leaves/${requestId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback('Leave cancelled and balance restored to ledger.');
        fetchData();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const handleReview = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const remark = prompt(`Enter ${action.toLowerCase()} remark:`) || '';
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewRemark: remark }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback(`Leave request ${action.toLowerCase()}ed.`);
        fetchData();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const pendingApprovals = requests.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Leave & Absence Management
            </h1>
            <span className="rounded-full bg-[#5428E8]/10 px-2.5 py-0.5 text-xs font-bold text-[#5428E8]">
              Statutory Working-Days Rule
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Public holidays and weekly offs are excluded from leave balance deductions
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#5428E8]/25 hover:bg-[#431fbd] transition"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {feedback && (
        <div className="rounded-2xl border border-indigo-100 bg-[#F6F5FF] p-4 text-xs font-semibold text-[#5428E8]">
          {feedback}
        </div>
      )}

      {/* Leave Balance Quota Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {balances.map((b) => (
          <div
            key={b.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">{b.leaveType.name}</span>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-[#5428E8]">
                {b.leaveType.code}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{b.remainingDays ?? b.balance}</span>
              <span className="text-xs font-semibold text-slate-400">/ {b.totalQuota ?? b.allocated} days</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>Used: {b.usedDays ?? b.used}</span>
              <span className="text-amber-600 font-semibold">Pending: {b.pendingDays ?? b.pending}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { key: 'requests', label: 'My Leave Requests', icon: CalendarDays, count: requests.length },
          ...(isElevated ? [{ key: 'approvals', label: 'Pending Approvals', icon: Clock, count: pendingApprovals.length }] : []),
          { key: 'calendar', label: 'Team Leave Calendar', icon: Calendar, count: calendarLeaves.length },
          ...(isElevated ? [{ key: 'policies', label: 'Leave Types & Policies', icon: Layers, count: leaveTypes.length }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
                isActive
                  ? 'bg-[#5428E8] text-white shadow-md shadow-[#5428E8]/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MY REQUESTS */}
      {activeTab === 'requests' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-slate-900">Submitted Leave Requests</h3>
            <span className="text-xs text-slate-400">Total: {requests.length} Requests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-3">Leave Type</th>
                  <th className="py-3 px-3">Date Range</th>
                  <th className="py-3 px-3">Days</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">{r.leaveType?.name}</td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#5428E8]">{r.totalDays || r.daysCount} days</td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{r.reason}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : r.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : r.status === 'CANCELLED'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                        <button
                          onClick={() => handleCancelLeave(r.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGER / HR APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Team Requests Requiring Decision</h3>
              <p className="text-xs text-slate-400">
                Approvals automatically deduct balance and mark attendance records as ON_LEAVE
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
              {pendingApprovals.length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Leave Type</th>
                  <th className="py-3 px-3">Dates</th>
                  <th className="py-3 px-3">Deductible Days</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingApprovals.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">
                        {req.employee?.firstName} {req.employee?.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400">{req.employee?.employeeCode}</p>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#5428E8]">{req.leaveType?.name}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">{req.totalDays || req.daysCount} days</td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{req.reason}</td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleReview(req.id, 'APPROVE')}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(req.id, 'REJECT')}
                        className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEAM CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-slate-900">Team Absences & Public Holidays</h3>
            <span className="text-xs text-slate-400">Synced with statutory office calendar</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-3 flex items-center gap-1.5">
                <Palmtree className="h-4 w-4 text-[#5428E8]" /> Public Holidays
              </h4>
              <div className="space-y-2">
                {holidays.map((h) => (
                  <div key={h.id} className="rounded-2xl border border-slate-100 bg-[#F6F5FF] p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{h.name}</p>
                      <p className="text-[10px] text-slate-400">{h.date}</p>
                    </div>
                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                      PUBLIC HOLIDAY
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-3 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-[#5428E8]" /> Approved Leaves This Month
              </h4>
              <div className="space-y-2">
                {calendarLeaves.map((l) => (
                  <div key={l.id} className="rounded-2xl border border-slate-100 bg-white p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {l.employee?.firstName} {l.employee?.lastName} ({l.employee?.department?.name || 'General'})
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {l.startDate.split('T')[0]} to {l.endDate.split('T')[0]} • {l.leaveType?.name}
                      </p>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      ON LEAVE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LEAVE POLICIES */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {leaveTypes.map((lt) => (
            <div key={lt.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900">{lt.name}</h4>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-[#5428E8]">
                  {lt.code}
                </span>
              </div>
              <p className="text-xs text-slate-500">{lt.description || 'Configured statutory leave policy'}</p>
              <div className="rounded-2xl bg-[#F6F5FF] p-3 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Annual Quota</span>
                <p className="text-xl font-black text-slate-900">{lt.maxDaysPerYear ?? lt.annualQuota ?? 12} Days / Year</p>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2">
                <span>{lt.isPaid ? 'Paid Leave' : 'Unpaid (LWP)'}</span>
                <span>Active Policy</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Apply for Leave</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Working days will be calculated automatically excluding holidays and weekly offs
            </p>

            <form onSubmit={handleApply} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Leave Type</label>
                <select
                  required
                  value={form.leaveTypeId}
                  onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.maxDaysPerYear ?? lt.annualQuota ?? 12} days/yr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="halfDayCheck"
                  checked={form.isHalfDay}
                  onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })}
                  className="rounded text-[#5428E8]"
                />
                <label htmlFor="halfDayCheck" className="text-xs font-bold text-slate-700">
                  Half-day leave (0.5 day)
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the reason for leave..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white hover:bg-[#431fbd]"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
