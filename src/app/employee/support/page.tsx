'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUi } from '@/components/providers/UiProvider';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/EnterpriseUI';
import { HelpCircle, Send, Mail, Phone, MessageSquare } from 'lucide-react';

function EmployeeSupportContent() {
  const { toast } = useUi();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') === 'request' ? 'request' : 'help';

  const [activeTab, setActiveTab] = useState<'help' | 'request'>(initialTab);
  const [tickets, setTickets] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: 'HR_QUERY',
    priority: 'MEDIUM',
    description: '',
  });

  useEffect(() => {
    setActiveTab(searchParams?.get('tab') === 'request' ? 'request' : 'help');
  }, [searchParams]);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/employee/support');
      if (res.ok) {
        const d = await res.json();
        setTickets(d.tickets || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/employee/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not submit request');
        return;
      }
      toast.success('Support request submitted to HR & Administration.');
      setForm({ subject: '', category: 'HR_QUERY', priority: 'MEDIUM', description: '' });
      setActiveTab('request');
      await loadTickets();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Support Desk"
        subtitle="Review employee workspace guides or raise a direct HR, attendance, or IT request."
        eyebrow="Employee Support"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('help')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'help'
              ? 'bg-[#6538ED] text-white'
              : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          Help &amp; Guides
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('request')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'request'
              ? 'bg-[#6538ED] text-white'
              : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          Raise a Request ({tickets.length})
        </button>
      </div>

      {activeTab === 'help' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="enterprise-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-[#6538ED]" />
              <span>Common Employee Questions</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="font-bold text-slate-800 dark:text-white">How do I punch in if GPS permission was denied?</p>
                <p className="mt-1">Allow browser location access in site settings, tap Refresh GPS on My Attendance &amp; Punch, or raise an Attendance Exception if working off-site.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="font-bold text-slate-800 dark:text-white">Where is my uploaded portrait photo stored?</p>
                <p className="mt-1">Your professional photo is stored inside your dedicated employee/user ID folder and reflected automatically across the directory.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="font-bold text-slate-800 dark:text-white">How do I download my payslips or appointment letter?</p>
                <p className="mt-1">Visit My Documents from your Employee Dashboard or sidebar to download official PDF payslips and employment letters anytime.</p>
              </div>
            </div>
          </div>

          <div className="enterprise-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#12B886]" />
              <span>Direct HR &amp; Operations Desk</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#6538ED]" />
                <span>contact@salmanenterprises.in</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#6538ED]" />
                <span>+91 (080) 4129-8800 (Mon–Sat, 9 AM – 7 PM IST)</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('request')}
              className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Raise a Formal Support Ticket</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSubmit} className="lg:col-span-5 enterprise-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Submit a New Request</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                placeholder="Brief summary of your request"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="enterprise-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="enterprise-input"
                >
                  <option value="HR_QUERY">HR Query</option>
                  <option value="ATTENDANCE_ISSUE">Attendance Issue</option>
                  <option value="PAYROLL_QUERY">Payroll Query</option>
                  <option value="LEAVE_QUERY">Leave Query</option>
                  <option value="IT_SUPPORT">IT Support</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
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
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Explain your question or issue clearly..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="enterprise-input"
              />
            </div>
            <button type="submit" disabled={submitting} className="enterprise-btn-primary w-full text-xs">
              {submitting ? 'Submitting...' : 'Submit Support Request'}
            </button>
          </form>

          <div className="lg:col-span-7 enterprise-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">My Support Tickets</h3>
            {tickets.length === 0 ? (
              <EmptyState
                title="No support requests submitted"
                description="Tickets you raise appear here with real-time resolution status."
              />
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.subject}</h4>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{t.description}</p>
                    <p className="text-[10px] text-slate-400">
                      {t.category.replace(/_/g, ' ')} • Priority {t.priority} • {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeSupportPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading support workspace...</div>}>
      <EmployeeSupportContent />
    </Suspense>
  );
}
