'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  Target,
  PlusCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react';

export default function SalesTargetsPage() {
  const [targets, setTargets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    employeeId: '',
    targetVisits: 50,
    targetDeliveries: 30,
    targetTurnover: 150000,
    notes: '',
  });

  const fetchTargets = useCallback(async () => {
    try {
      const [tRes, eRes] = await Promise.all([
        fetch(`/api/sales/targets?month=${month}&year=${year}`),
        fetch('/api/employees'),
      ]);
      if (tRes.ok) {
        const tData = await tRes.json();
        setTargets(tData.targets || []);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        setEmployees(eData.employees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sales/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, month, year }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddOpen(false);
        setFeedback(`Target assigned to representative successfully.`);
        fetchTargets();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Sales Targets &amp; Quota Achievement
            </h1>
            <span className="rounded-full bg-[#5428E8]/10 px-2.5 py-0.5 text-xs font-bold text-[#5428E8]">
              {targets.length} Quota Plans
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Territory quotas, monthly turnover benchmarks, visit quotas, and real-time achievement tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs"
          >
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (employees.length > 0) setForm({ ...form, employeeId: employees[0].id });
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[#5428E8] px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-[#5428E8]/20 hover:bg-[#431fbd]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Assign Target</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl border border-indigo-100 bg-[#F6F5FF] p-4 text-xs font-semibold text-[#5428E8]">
          {feedback}
        </div>
      )}

      {/* Targets Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading sales targets...</div>
        ) : targets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            No sales targets configured for this month. Click &quot;Assign Target&quot; to set one.
          </div>
        ) : (
          targets.map((t) => (
            <div
              key={t.id}
              className="rounded-3xl border border-[#E6E8F2] bg-white p-5 shadow-xs transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t.employee?.firstName} {t.employee?.lastName}
                  </h3>
                  <p className="text-[11px] text-slate-400">{t.employee?.employeeCode} • {t.employee?.designation}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-[#5428E8]">
                  <Target className="h-5 w-5" />
                </div>
              </div>

              {/* Turnover Quota Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600">Turnover Quota</span>
                  <span className="text-[#5428E8]">{t.turnoverProgress}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#5428E8] transition-all duration-500"
                    style={{ width: `${t.turnoverProgress}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] font-mono text-slate-400">
                  <span className="font-bold text-slate-700">₹{t.achievedTurnover?.toLocaleString()}</span>
                  <span>Target: ₹{t.targetTurnover?.toLocaleString()}</span>
                </div>
              </div>

              {/* Visits & Deliveries Progress */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#F6F5FF] p-3 text-center text-xs">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Visits</p>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {t.achievedVisits} / {t.targetVisits}
                  </p>
                  <p className="text-[9px] text-[#5428E8] font-semibold">{t.visitProgress}%</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Deliveries</p>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {t.achievedDeliveries} / {t.targetDeliveries}
                  </p>
                  <p className="text-[9px] text-indigo-600 font-semibold">{t.delProgress}%</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Assign Target */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Assign Monthly Sales Quota</h3>
              <button onClick={() => setIsAddOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Representative *</label>
                <select
                  required
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-[#5428E8] focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Turnover (₹) *</label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={form.targetTurnover}
                  onChange={(e) => setForm({ ...form, targetTurnover: parseFloat(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Visits</label>
                  <input
                    type="number"
                    value={form.targetVisits}
                    onChange={(e) => setForm({ ...form, targetVisits: parseInt(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Deliveries</label>
                  <input
                    type="number"
                    value={form.targetDeliveries}
                    onChange={(e) => setForm({ ...form, targetDeliveries: parseInt(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#5428E8]/20 hover:bg-[#431fbd]"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
