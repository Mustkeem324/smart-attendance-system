'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { useUi } from '@/components/providers/UiProvider';
import { CalendarDays, CheckSquare, Megaphone } from 'lucide-react';

export function ApplyLeaveModal({
  isOpen,
  onClose,
  leaveTypes,
  balances,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  leaveTypes: Array<{ id: string; name: string; code: string }>;
  balances: Array<{ leaveTypeId: string; remainingDays: number }>;
  onSuccess: () => Promise<void> | void;
}) {
  const { toast } = useUi();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    halfDayPeriod: 'FIRST_HALF',
    reason: '',
  });

  useEffect(() => {
    if (isOpen && leaveTypes.length > 0 && !form.leaveTypeId) {
      setForm((prev) => ({ ...prev, leaveTypeId: leaveTypes[0].id }));
    }
  }, [isOpen, leaveTypes, form.leaveTypeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/leaves/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not submit leave application');
        return;
      }
      toast.success('Leave application submitted successfully.');
      setForm({ leaveTypeId: leaveTypes[0]?.id || '', startDate: '', endDate: '', isHalfDay: false, halfDayPeriod: 'FIRST_HALF', reason: '' });
      await onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Network error submitting leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply for Leave"
      description="Submit a leave request directly to your reporting manager and HR."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Leave Category *
          </label>
          <select
            required
            value={form.leaveTypeId}
            onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
            className="enterprise-input"
          >
            <option value="">Select leave category</option>
            {leaveTypes.map((lt) => {
              const bal = balances.find((b) => b.leaveTypeId === lt.id);
              return (
                <option key={lt.id} value={lt.id}>
                  {lt.name} ({bal ? `${bal.remainingDays} days available` : lt.code})
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate || e.target.value })}
              className="enterprise-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              End Date *
            </label>
            <input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="enterprise-input"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isHalfDay}
              onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })}
              className="rounded border-slate-300 text-[#6538ED] focus:ring-[#6538ED]"
            />
            Half-Day Leave
          </label>

          {form.isHalfDay && (
            <select
              value={form.halfDayPeriod}
              onChange={(e) => setForm({ ...form, halfDayPeriod: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="FIRST_HALF">First Half (Morning)</option>
              <option value="SECOND_HALF">Second Half (Afternoon)</option>
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason for Leave *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Provide brief reason or handover details..."
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="enterprise-input"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{submitting ? 'Submitting...' : 'Submit Leave Request'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function TaskFormModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const { toast } = useUi();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/employee/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not save task');
        return;
      }
      toast.success('Task added to your workspace.');
      setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM' });
      await onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Personal Goal / Task"
      description="Track work deliverables, priorities, and target completion dates."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Task Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Complete monthly dealer reconciliations"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="enterprise-input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Priority
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="enterprise-input"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="enterprise-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Details, checklist notes, or key deliverables..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="enterprise-input"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{submitting ? 'Saving...' : 'Create Task'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function PublishAnnouncementModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const { toast } = useUi();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'COMPANY',
    audienceType: 'ALL',
    isPinned: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/employee/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not publish announcement');
        return;
      }
      toast.success('Announcement published cleanly.');
      setForm({ title: '', description: '', category: 'COMPANY', audienceType: 'ALL', isPinned: false });
      await onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish Workforce Announcement"
      description="Broadcast company policies, reminders, or branch notices to employees."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Updated Winter Shift Guidelines"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="enterprise-input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="enterprise-input"
            >
              <option value="COMPANY">Company Notice</option>
              <option value="BRANCH">Branch Notice</option>
              <option value="DEPARTMENT">Department Update</option>
              <option value="HOLIDAY">Holiday Notification</option>
              <option value="POLICY">Policy Update</option>
              <option value="REMINDER">Important Reminder</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Audience Visibility
            </label>
            <select
              value={form.audienceType}
              onChange={(e) => setForm({ ...form, audienceType: e.target.value })}
              className="enterprise-input"
            >
              <option value="ALL">All Organization Staff</option>
              <option value="BRANCH">Specific Branch Audience</option>
              <option value="DEPARTMENT">Department Audience</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Message *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Full announcement text..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="enterprise-input"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.isPinned}
            onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
            className="rounded border-slate-300 text-[#6538ED]"
          />
          Pin announcement at top of employee dashboards
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5">
            <Megaphone className="h-3.5 w-3.5" />
            <span>{submitting ? 'Publishing...' : 'Publish Notice'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
