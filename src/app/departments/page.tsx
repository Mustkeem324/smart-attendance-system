'use client';

import React, { useState, useEffect } from 'react';
import { Building2, PlusCircle, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setForm({ name: '', code: '', description: '' });
        fetchDepts();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to add department');
      }
    } catch (err: any) {
      alert(err.message);
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
            Organize teams, assign department codes, and monitor departmental presence.
          </p>
        </div>

        {isElevated && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-700"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading departments...</div>
        ) : (
          departments.map((d) => (
            <div
              key={d.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                  <Building2 className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {d.code}
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{d.name}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {d.description || 'No description provided'}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                <span className="text-slate-400">Total Staff:</span>
                <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                  <Users className="h-3.5 w-3.5 text-brand-600" />
                  {d._count?.employees || 0}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add New Department</h2>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance & Testing"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QA"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
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
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
