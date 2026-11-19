'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  Clock,
  PlusCircle,
  Moon,
  Sun,
  Coffee,
  ArrowLeftRight,
  TrendingUp,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ShiftsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'shifts' | 'roster' | 'swaps' | 'breaks' | 'overtime'>('shifts');

  const [shifts, setShifts] = useState<any[]>([]);
  const [roster, setRoster] = useState<any>(null);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [overtimeRecords, setOvertimeRecords] = useState<any[]>([]);
  const [breakStatus, setBreakStatus] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Month / Year selector
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Add Shift Modal
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    code: '',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
    halfDayThresholdHours: 4.5,
    fullDayThresholdHours: 8.0,
    isOvernight: false,
    isFlexible: false,
  });

  // Swap Request Modal
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapForm, setSwapForm] = useState({
    targetEmployeeId: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  // Fetch all shift data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [shiftsRes, rosterRes, swapsRes, otRes, breakRes] = await Promise.all([
        fetch('/api/shifts'),
        fetch(`/api/shifts/roster?month=${selectedMonth}&year=${selectedYear}`),
        fetch('/api/shifts/swap'),
        fetch('/api/attendance/overtime'),
        fetch('/api/attendance/break'),
      ]);

      if (shiftsRes.ok) {
        const data = await shiftsRes.json();
        setShifts(data.shifts || []);
      }
      if (rosterRes.ok) {
        const data = await rosterRes.json();
        setRoster(data.roster || null);
      }
      if (swapsRes.ok) {
        const data = await swapsRes.json();
        setSwapRequests(data.swapRequests || []);
      }
      if (otRes.ok) {
        const data = await otRes.json();
        setOvertimeRecords(data.records || []);
      }
      if (breakRes.ok) {
        const data = await breakRes.json();
        setBreakStatus(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create Shift
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftForm),
      });
      if (res.ok) {
        setIsAddShiftOpen(false);
        setShiftForm({
          name: '',
          code: '',
          startTime: '09:00',
          endTime: '18:00',
          gracePeriodMinutes: 15,
          halfDayThresholdHours: 4.5,
          fullDayThresholdHours: 8.0,
          isOvernight: false,
          isFlexible: false,
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate Roster
  const handleGenerateRoster = async () => {
    try {
      const res = await fetch('/api/shifts/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          rotationPattern: [
            { shiftId: shifts[0]?.id || '', days: 2 },
            { shiftId: shifts[1]?.id || shifts[0]?.id || '', days: 2 },
          ],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(`Monthly roster generated successfully with ${data.result?.totalEntriesCreated || 0} entries.`);
        fetchData();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  // Handle Break Punch
  const handleBreakAction = async (action: 'START' | 'END', breakType: string = 'LUNCH') => {
    try {
      const res = await fetch('/api/attendance/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, breakType }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message);
        fetchData();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  // Review Overtime
  const handleReviewOvertime = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/attendance/overtime', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Review Swap
  const handleReviewSwap = async (swapRequestId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/shifts/swap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swapRequestId, action }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Shift Scheduling & Overtime Engine
            </h1>
            <span className="rounded-full bg-[#5428E8]/10 px-2.5 py-0.5 text-xs font-bold text-[#5428E8]">
              Rotational Roster 24/7
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-midnight overnight shifts, break tracking, shift swaps, and automated overtime rate multipliers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddShiftOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#5428E8]/25 hover:bg-[#431fbd] transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Shift</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl border border-indigo-100 bg-[#F6F5FF] p-4 text-xs font-semibold text-[#5428E8]">
          {feedback}
        </div>
      )}

      {/* Break Punch Widget (Available to all) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5428E8]/10 text-[#5428E8]">
            <Coffee className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Employee Break Tracker</h3>
            <p className="text-xs text-slate-500">
              {breakStatus?.activeBreak ? (
                <span className="text-amber-600 font-bold">
                  Active {breakStatus.activeBreak.breakType} Break in progress (started at {new Date(breakStatus.activeBreak.startTime).toLocaleTimeString()})
                </span>
              ) : (
                `Total breaks today: ${breakStatus?.totalMinutes || 0} minutes recorded`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {breakStatus?.activeBreak ? (
            <button
              onClick={() => handleBreakAction('END')}
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
            >
              End Active Break
            </button>
          ) : (
            <>
              <button
                onClick={() => handleBreakAction('START', 'LUNCH')}
                className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Start Lunch Break
              </button>
              <button
                onClick={() => handleBreakAction('START', 'TEA')}
                className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Start Tea Break
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { key: 'shifts', label: 'Shift Master', icon: Clock, count: shifts.length },
          { key: 'roster', label: 'Monthly Roster', icon: Calendar, count: roster?.entries?.length || 0 },
          { key: 'swaps', label: 'Shift Swaps', icon: ArrowLeftRight, count: swapRequests.length },
          { key: 'overtime', label: 'Overtime Engine', icon: TrendingUp, count: overtimeRecords.length },
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

      {/* TAB 1: SHIFT MASTER */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#5428E8]/10 text-[#5428E8]">
                    {shift.isOvernight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </span>
                  <h3 className="font-extrabold text-slate-900">{shift.name}</h3>
                </div>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-[#5428E8]">
                  {shift.code}
                </span>
              </div>

              <div className="rounded-2xl bg-[#F6F5FF] p-3 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Shift Timing</span>
                <p className="text-base font-black text-slate-900">
                  {shift.startTime} – {shift.endTime}
                </p>
                {shift.isOvernight && (
                  <p className="text-[10px] font-bold text-indigo-600">Crosses Midnight (+1 Day)</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="rounded-xl border border-slate-100 p-2">
                  <span className="text-[10px] text-slate-400">Grace Period:</span>
                  <p className="font-bold">{shift.gracePeriodMinutes} mins</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-2">
                  <span className="text-[10px] text-slate-400">Full Day Threshold:</span>
                  <p className="font-bold">{shift.fullDayThresholdHours} hrs</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>{shift._count?.employees || 0} Employees Assigned</span>
                <span className="text-emerald-600 font-bold">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: MONTHLY ROSTER */}
      {activeTab === 'roster' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Monthly Shift Roster ({new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })})
              </h3>
              <p className="text-xs text-slate-400">
                Automated rotational pattern allocations across teams with weekly offs
              </p>
            </div>

            <button
              onClick={handleGenerateRoster}
              className="flex items-center gap-2 rounded-2xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#5428E8]/20 hover:bg-[#431fbd] transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate / Refresh Roster</span>
            </button>
          </div>

          {!roster || !roster.entries || roster.entries.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-700">No Roster Generated for this Month</p>
              <p className="text-[11px] text-slate-400">
                Click &quot;Generate / Refresh Roster&quot; to auto-assign shifts using rotational patterns.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Assigned Shift</th>
                    <th className="py-2.5 px-3">Timing</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roster.entries.slice(0, 30).map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{entry.date}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {entry.employee.firstName} {entry.employee.lastName}
                        <span className="block text-[10px] text-slate-400">{entry.employee.employeeCode}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{entry.employee.department?.name || '-'}</td>
                      <td className="py-2.5 px-3 font-bold text-[#5428E8]">{entry.shift.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {entry.shift.startTime} – {entry.shift.endTime}
                      </td>
                      <td className="py-2.5 px-3">
                        {entry.isWeeklyOff ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            WEEKLY OFF
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            SCHEDULED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SHIFT SWAP REQUESTS */}
      {activeTab === 'swaps' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Employee Shift Swap Requests</h3>
              <p className="text-xs text-slate-400">
                Peer-to-peer shift swaps automatically adjust roster entries when approved
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Requestor</th>
                  <th className="py-3 px-3">Swap With (Colleague)</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Approval Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {swapRequests.map((swap) => (
                  <tr key={swap.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{swap.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {swap.requestorEmployee.firstName} {swap.requestorEmployee.lastName}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      {swap.targetEmployee.firstName} {swap.targetEmployee.lastName}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{swap.reason}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold ${
                          swap.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : swap.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {swap.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      {swap.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleReviewSwap(swap.id, 'APPROVE')}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewSwap(swap.id, 'REJECT')}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: OVERTIME ENGINE */}
      {activeTab === 'overtime' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Calculated Overtime Records</h3>
              <p className="text-xs text-slate-400">
                1.5x Multiplier for normal workdays, 2.0x for weekly offs and holidays
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Overtime Hours</th>
                  <th className="py-3 px-3">Rate Multiplier</th>
                  <th className="py-3 px-3">Total Payable</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overtimeRecords.map((ot) => (
                  <tr key={ot.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{ot.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {ot.employee.firstName} {ot.employee.lastName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{ot.employee.department?.name || '-'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">{ot.hours} hrs</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{ot.rateMultiplier}x</td>
                    <td className="py-3 px-3 font-mono font-black text-emerald-600">₹{ot.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold ${
                          ot.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : ot.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {ot.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      {ot.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleReviewOvertime(ot.id, 'APPROVE')}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewOvertime(ot.id, 'REJECT')}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Shift */}
      {isAddShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Create Work Shift</h3>
            <p className="text-xs text-slate-400 mt-0.5">Configure schedule timings, thresholds, and overnight flags</p>

            <form onSubmit={handleCreateShift} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Shift Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Night Shift Rotation"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Shift Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NIGHT"
                  value={shiftForm.code}
                  onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Start Time (HH:mm)</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">End Time (HH:mm)</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="overnightCheck"
                  checked={shiftForm.isOvernight}
                  onChange={(e) => setShiftForm({ ...shiftForm, isOvernight: e.target.checked })}
                  className="rounded text-[#5428E8]"
                />
                <label htmlFor="overnightCheck" className="text-xs font-bold text-slate-700">
                  Overnight Shift (crosses midnight into next calendar day)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddShiftOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white hover:bg-[#431fbd]"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
