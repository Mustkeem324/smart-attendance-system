'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';

export default function AttendanceExceptionsPage() {
  const { user } = useAuth();
  const { toast, prompt } = useUi();
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    reason: 'OUTSIDE_GEOFENCE',
    exceptionDate: new Date().toISOString().split('T')[0],
    explanation: '',
  });

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/exception');
      if (res.ok) {
        const data = await res.json();
        setExceptions(data.exceptions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/attendance/exception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback('Exception request submitted for supervisor approval.');
        toast.success('Exception request submitted.');
        setIsSubmitModalOpen(false);
        setForm({
          reason: 'OUTSIDE_GEOFENCE',
          exceptionDate: new Date().toISOString().split('T')[0],
          explanation: '',
        });
        fetchExceptions();
      } else {
        toast.error(data.error || 'Failed to submit exception');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDecision = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const remark = await prompt({
      title: `${action === 'APPROVE' ? 'Approve' : 'Reject'} Exception Request`,
      message: 'Add an optional supervisor note for the attendance audit trail.',
      placeholder: `Enter ${action.toLowerCase()} remark...`,
      confirmText: action === 'APPROVE' ? 'Approve' : 'Reject',
    });
    if (remark === null) return;
    try {
      const res = await fetch(`/api/attendance/exception/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewRemark: remark }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback(`Exception request ${action.toLowerCase()}d.`);
        toast.success(`Exception request ${action.toLowerCase()}d.`);
        fetchExceptions();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Attendance Exceptions & Exception Approval Queue
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submit and review punch exception requests due to GPS issues, remote client meetings, or camera hardware failures.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-700"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Submit Exception Request</span>
        </button>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Exceptions Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {isElevated ? 'Workforce Exception Requests Queue' : 'My Submitted Exceptions'}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Reason Category</th>
                <th className="px-5 py-3.5">Explanation / Note</th>
                <th className="px-5 py-3.5">Status</th>
                {isElevated && <th className="px-5 py-3.5 text-right">Approval Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Loading exceptions...
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No attendance exception requests found.
                  </td>
                </tr>
              ) : (
                exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {ex.employee?.firstName} {ex.employee?.lastName}
                      <span className="block text-[11px] font-normal text-slate-400">
                        {ex.employee?.employeeCode} • {ex.employee?.department?.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {ex.exceptionDate}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                        {ex.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {ex.explanation}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          ex.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : ex.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    {isElevated && (
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        {ex.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDecision(ex.id, 'APPROVE')}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDecision(ex.id, 'REJECT')}
                              className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {ex.reviewRemark ? `Remark: ${ex.reviewRemark}` : 'Decided'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Exception Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 ">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Submit Attendance Exception Request
              </h2>
              <button onClick={() => setIsSubmitModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Exception Reason *
                </label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                >
                  <option value="OUTSIDE_GEOFENCE">Employee Outside Geofence (On-site visit)</option>
                  <option value="GPS_UNAVAILABLE">GPS Signal Unavailable / Device Hardware</option>
                  <option value="CAMERA_NOT_WORKING">Camera Unavailable / Hardware Failure</option>
                  <option value="MISSED_CHECK_IN">Missed Check-In Punch</option>
                  <option value="MISSED_CHECK_OUT">Missed Check-Out Punch</option>
                  <option value="TEMPORARY_RELOCATION">Temporary Office Relocation / Client Office</option>
                  <option value="OTHER">Other Administrative Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.exceptionDate}
                  onChange={(e) => setForm({ ...form, exceptionDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Detailed Explanation / Evidence *
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  placeholder="Explain why you were outside the registered geofence or unable to punch normally..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Submit For Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
