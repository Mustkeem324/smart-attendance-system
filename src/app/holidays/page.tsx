'use client';

import React, { useState, useEffect } from 'react';
import { Palmtree, PlusCircle, Calendar, Upload, FileSpreadsheet, Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function HolidaysPage() {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', date: '', description: '', isOptional: false });
  const [importJson, setImportJson] = useState('');

  const isElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(user.role);

  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/holidays');
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({ name: '', date: '', description: '', isOptional: false });
        setFeedback('Holiday created successfully.');
        fetchHolidays();
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(importJson);
      const res = await fetch('/api/admin/holidays/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidays: parsed }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsImportModalOpen(false);
        setImportJson('');
        setFeedback(`Imported ${data.importedCount} holidays.`);
        fetchHolidays();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback('Invalid JSON format. Expected array of { name, date, description }');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Statutory Holiday Calendar
            </h1>
            <span className="rounded-full bg-[#5428E8]/10 px-2.5 py-0.5 text-xs font-bold text-[#5428E8]">
              Automated Attendance Exclusion
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Employees are never marked absent on public or company-configured holidays
          </p>
        </div>

        {isElevated && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <span>Bulk Import</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#5428E8]/25 hover:bg-[#431fbd] transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Holiday</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="rounded-2xl border border-indigo-100 bg-[#F6F5FF] p-4 text-xs font-semibold text-[#5428E8]">
          {feedback}
        </div>
      )}

      {/* Grid of Holidays */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {holidays.map((h) => {
          const dateObj = new Date(h.date);
          const monthName = dateObj.toLocaleString('en-US', { month: 'short' });
          const day = dateObj.getDate();
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

          return (
            <div
              key={h.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4 hover:shadow-md transition"
            >
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#F6F5FF] border border-indigo-100 text-center">
                <span className="text-[10px] font-extrabold uppercase text-[#5428E8]">{monthName}</span>
                <span className="text-xl font-black text-slate-900 leading-none mt-0.5">{day}</span>
              </div>

              <div className="flex-1 truncate">
                <h4 className="font-extrabold text-slate-900 truncate">{h.name}</h4>
                <p className="text-xs text-slate-500">{dayName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-md px-1.5 py-0.2 text-[9px] font-extrabold ${
                      h.isOptional
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {h.isOptional ? 'OPTIONAL / RESTRICTED' : 'PUBLIC HOLIDAY'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add Holiday */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60  p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Add Statutory Holiday</h3>
            <p className="text-xs text-slate-400 mt-0.5">Configure statutory off-day for the organization</p>

            <form onSubmit={handleAdd} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Holiday Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Independence Day"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Description</label>
                <input
                  type="text"
                  placeholder="e.g. National holiday"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="optCheck"
                  checked={formData.isOptional}
                  onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
                  className="rounded text-[#5428E8]"
                />
                <label htmlFor="optCheck" className="text-xs font-bold text-slate-700">
                  Optional / Restricted holiday
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white hover:bg-[#431fbd]"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Import */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60  p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Bulk Import Holidays</h3>
            <p className="text-xs text-slate-400 mt-0.5">Paste JSON array of holidays to import in one click</p>

            <form onSubmit={handleBulkImport} className="mt-4 space-y-3">
              <textarea
                rows={6}
                required
                placeholder='[{"name": "Republic Day", "date": "2026-01-26"}, {"name": "Holi", "date": "2026-03-04"}]'
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white hover:bg-[#431fbd]"
                >
                  Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
