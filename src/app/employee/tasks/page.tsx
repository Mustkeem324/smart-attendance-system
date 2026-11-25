'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUi } from '@/components/providers/UiProvider';
import { PageHeader, StatusBadge, EmptyState, SkeletonCards } from '@/components/ui/EnterpriseUI';
import { TaskFormModal } from '@/components/employee-dashboard/EmployeeQuickModals';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';

export default function EmployeeTasksPage() {
  const { toast, confirm } = useUi();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const qs = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/employee/tasks${qs}`);
      const data = await res.json();
      if (res.ok) setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/employee/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success('Task status updated.');
      loadTasks();
    } else {
      const d = await res.json();
      toast.error(d.error || 'Could not update task');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Delete Task',
      message: `Remove task "${title}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/employee/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Task removed.');
      loadTasks();
    } else {
      const d = await res.json();
      toast.error(d.error || 'Only manager-created or self-created tasks may be deleted.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Goals & Tasks"
        subtitle="View manager assignments, track deliverable due dates, and update work progress."
        eyebrow="Productivity & Goals"
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Task / Goal</span>
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              statusFilter === st
                ? 'bg-[#6538ED] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {st === 'ALL' ? 'All Tasks' : st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonCards count={3} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks match this filter"
          description="Create a personal goal or wait for manager-assigned deliverables."
          actionLabel="Create Task"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="enterprise-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-[#6538ED] shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</h3>
                  <StatusBadge status={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
                {t.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">{t.description}</p>
                )}
                <p className="text-[11px] text-slate-400">
                  Assigned by {t.assignedByName} on {new Date(t.assignedDate).toLocaleDateString()} •{' '}
                  {t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : 'Open due date'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  aria-label={`Status for ${t.title}`}
                  value={t.status}
                  onChange={(e) => handleStatusChange(t.id, e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id, t.title)}
                  className="rounded-xl p-2 text-rose-500 hover:bg-rose-50"
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskFormModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSuccess={loadTasks} />
    </div>
  );
}
