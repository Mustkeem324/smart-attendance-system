'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  X,
  Search,
  KeyRound,
  UserX,
  UserCheck,
  Copy,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';
import { PaginationControls } from '@/components/ui/EnterpriseUI';

const ASSIGNABLE_ROLES = [
  'COMPANY_ADMIN',
  'HR_MANAGER',
  'TEAM_MANAGER',
  'SALES_MANAGER',
  'FIELD_SALES_REP',
  'INVENTORY_MANAGER',
  'DELIVERY_AGENT',
  'EMPLOYEE',
  'RETAILER',
  'DISTRIBUTOR',
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast, confirm } = useUi();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'SALES_MANAGER',
  });
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const [issuedLink, setIssuedLink] = useState<{ email: string; url: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/users');
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || []);
      }
    } catch {
      toast.error('Failed to fetch users list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSaving(true);
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error || 'Failed to create user');
      } else {
        setShowAddModal(false);
        setFormData({ email: '', password: '', role: 'SALES_MANAGER' });
        toast.success('Workspace user account created.');
        fetchUsers();
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (u: any, nextRole: string) => {
    if (nextRole === u.role) return;
    try {
      const res = await fetch(`/api/v1/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Could not update role');
      } else {
        toast.success(`Updated role for ${u.email} to ${nextRole}`);
        fetchUsers();
      }
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleToggleActive = async (u: any) => {
    const nextActive = !u.isActive;
    const ok = await confirm({
      title: nextActive ? 'Activate User Account' : 'Revoke & Deactivate Account',
      message: nextActive
        ? `Restore workspace sign-in access for ${u.email}?`
        : `Immediately revoke sign-in sessions and deactivate ${u.email}? Historical records remain preserved.`,
      confirmText: nextActive ? 'Activate' : 'Deactivate',
      variant: nextActive ? 'primary' : 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/v1/users/${u.id}`, {
        method: nextActive ? 'PATCH' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: nextActive ? JSON.stringify({ isActive: true }) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Status update failed');
      } else {
        toast.success(nextActive ? 'User account activated.' : 'User account deactivated.');
        fetchUsers();
      }
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const handleIssueResetLink = async (u: any) => {
    try {
      const res = await fetch(`/api/v1/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE_RESET_LINK' }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Could not generate recovery link');
      } else if (json.data?.resetUrl) {
        const absoluteUrl = `${window.location.origin}${json.data.resetUrl}`;
        setIssuedLink({ email: u.email, url: absoluteUrl });
        toast.success('One-time password reset link generated.');
      }
    } catch {
      toast.error('Network error generating reset link');
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.email?.toLowerCase().includes(q) ||
        `${u.employee?.firstName || ''} ${u.employee?.lastName || ''}`.toLowerCase().includes(q) ||
        (u.employee?.employeeCode || '').toLowerCase().includes(q);
      const matchesRole = !roleFilter || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#8255FF]" />
            User Management &amp; Access Control
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Provision accounts, manage role-based workspace permissions, suspend access, and issue recovery links.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] text-white text-xs font-bold shadow-lg shadow-[#6538ED]/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add System User</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by email, staff name, or code..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#151A38] border border-[#23294E] text-xs text-white placeholder-slate-500 outline-none focus:border-[#6538ED]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl bg-[#151A38] border border-[#23294E] text-xs text-white outline-none focus:border-[#6538ED]"
        >
          <option value="">All Roles ({users.length})</option>
          {['SUPER_ADMIN', ...ASSIGNABLE_ROLES].map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {issuedLink && (
        <div className="rounded-2xl border border-[#12B886]/30 bg-[#12B886]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <p className="font-bold text-white">
              One-Time Password Reset Link Ready for {issuedLink.email}
            </p>
            <p className="font-mono text-[11px] text-emerald-200 truncate mt-1">{issuedLink.url}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(issuedLink.url);
                toast.success('Reset URL copied to clipboard.');
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-[#12B886] px-3 py-1.5 font-bold text-[#15172B]"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </button>
            <button
              type="button"
              onClick={() => setIssuedLink(null)}
              className="rounded-xl border border-white/15 px-2.5 py-1.5 text-slate-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">User Email &amp; Identity</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#8255FF] mx-auto mb-2" />
                    Loading workspace users...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                paginated.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{u.email}</div>
                        <div className="text-[10px] text-slate-400">
                          {u.employee
                            ? `${u.employee.firstName} ${u.employee.lastName} (${u.employee.employeeCode})`
                            : 'Partner / System Account'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {u.role === 'SUPER_ADMIN' ? (
                          <span className="px-2.5 py-1 rounded-md bg-[#6538ED]/20 text-purple-200 border border-[#6538ED]/40 font-mono text-[10px] font-bold">
                            SUPER_ADMIN
                          </span>
                        ) : (
                          <select
                            disabled={isSelf}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className="rounded-lg bg-[#0C0E22] border border-[#2A2E5A] px-2 py-1 text-[11px] font-semibold text-purple-200 outline-none focus:border-[#6538ED] disabled:opacity-60"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.isActive ? (
                          <span className="text-[#12B886] font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleIssueResetLink(u)}
                            title="Issue one-time password reset link"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#6538ED]/25 text-slate-300 hover:text-white transition"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              title={u.isActive ? 'Deactivate user' : 'Reactivate user'}
                              className={`p-1.5 rounded-lg transition ${
                                u.isActive
                                  ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                              }`}
                            >
                              {u.isActive ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-3 border-t border-[#23294E]">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
          />
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <h2 className="text-base font-bold text-white">Add System User</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="employee@salmanenterprises.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0C0E22] border border-[#23294E] text-white outline-none focus:border-[#6538ED]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0C0E22] border border-[#23294E] text-white outline-none focus:border-[#6538ED]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0C0E22] border border-[#23294E] text-white outline-none focus:border-[#6538ED]"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#23294E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0C0E22] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] text-white font-semibold disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
