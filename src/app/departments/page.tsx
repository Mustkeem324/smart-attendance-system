'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, PlusCircle, Users, Edit2, Trash2, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';
import { EmptyState, SkeletonCards } from '@/components/ui/EnterpriseUI';

export default function DepartmentsPage() {
  const { user } = useAuth();
  const { toast, confirm } = useUi();
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  // Staff inspection drawer modal
  const [detailDept, setDetailDept] = useState<any | null>(null);

  const fetchDepts = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const openAdd = () => {
    setEditingDept(null);
    setForm({ name: '', code: '', description: '' });
    setIsModalOpen(true);
  };

  const openEdit = (d: any) => {
    setEditingDept(d);
    setForm({ name: d.name || '', code: d.code || '', description: d.description || '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
      const method = editingDept ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const d = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setForm({ name: '', code: '', description: '' });
        toast.success(editingDept ? 'Department updated.' : 'Department created.');
        fetchDepts();
      } else {
        toast.error(d.error || 'Failed to save department');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: any) => {
    const ok = await confirm({
      title: 'Delete Department',
      message: `Remove department "${d.name}" (${d.code})? Active employees must be reassigned before deletion.`,
      confirmText: 'Delete Department',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/departments/${d.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Department deleted.');
        fetchDepts();
      } else {
        toast.error(data.error || 'Could not delete department');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openTeamRoster = async (deptId: string) => {
    try {
      const res = await fetch(`/api/departments/${deptId}`);
      const data = await res.json();
      if (res.ok && data.department) {
        setDetailDept(data.department);
      } else {
        toast.error(data.error || 'Could not load department roster');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Department Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize business units, update codes, and inspect employee allocations across departments.
          </p>
        </div>

        {isElevated && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-xl bg-[#6538ED] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#6538ED]/25 hover:bg-[#562BD4] transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonCards count={6} />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments created"
          description="Create operational departments to organize employees, shifts, and attendance reporting."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <div
              key={d.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0F122B] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6538ED]/10 text-[#6538ED]">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-mono">
                      {d.code}
                    </span>
                    {isElevated && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          title="Edit department"
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-[#6538ED] dark:hover:bg-slate-800"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d)}
                          title="Delete department"
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{d.name}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {d.description || 'Operational department'}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Users className="h-3.5 w-3.5 text-[#6538ED]" />
                  {d._count?.employees || 0} Staff
                </span>
                <button
                  type="button"
                  onClick={() => openTeamRoster(d.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#6538ED] hover:underline"
                >
                  <span>Inspect Allocation</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distribution & Field Sales"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DIST"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Scope of department responsibilities..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#6538ED] px-5 py-2 text-xs font-semibold text-white hover:bg-[#562BD4] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocated Staff Drawer Modal */}
      {detailDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {detailDept.name} ({detailDept.code})
                </h2>
                <p className="text-[11px] text-slate-400">
                  {detailDept.employees?.length || 0} active allocated team member(s)
                </p>
              </div>
              <button type="button" onClick={() => setDetailDept(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
              {!detailDept.employees || detailDept.employees.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No active employees are currently assigned to this department.
                </p>
              ) : (
                detailDept.employees.map((emp: any) => (
                  <Link
                    key={emp.id}
                    href={`/employees/${emp.id}`}
                    onClick={() => setDetailDept(null)}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 p-3 hover:border-[#6538ED] dark:border-slate-800 transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {emp.designation} • {emp.employeeCode}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {emp.employmentStatus}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
