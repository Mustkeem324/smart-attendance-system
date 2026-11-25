'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, PlusCircle, Edit2, Trash2, Users, X, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';
import { EmptyState, SkeletonCards } from '@/components/ui/EnterpriseUI';

const LiveGeofenceMap = dynamic(() => import('@/components/maps/LiveGeofenceMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-500 dark:bg-slate-800">
      Loading branch geofence map...
    </div>
  ),
});

export default function BranchesPage() {
  const { user } = useAuth();
  const { toast, confirm } = useUi();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    city: 'Bangalore',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 75,
  });

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches');
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setForm({
      name: '',
      code: '',
      address: '',
      city: 'Bangalore',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 75,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (b: any) => {
    setEditingBranch(b);
    setForm({
      name: b.name || '',
      code: b.code || '',
      address: b.address || '',
      city: b.city || '',
      country: b.country || 'India',
      latitude: Number(b.latitude) || 0,
      longitude: Number(b.longitude) || 0,
      radiusMeters: Number(b.radiusMeters) || 75,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : '/api/branches';
      const method = editingBranch ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const d = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        toast.success(editingBranch ? 'Branch updated successfully.' : 'Branch added successfully.');
        fetchBranches();
      } else {
        toast.error(d.error || 'Failed to save branch');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: any) => {
    const ok = await confirm({
      title: 'Delete Branch',
      message: `Remove "${b.name}" (${b.code})? Branches with active assigned employees must have staff reassigned first.`,
      confirmText: 'Delete Branch',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/branches/${b.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (res.ok) {
        toast.success('Branch deleted successfully.');
        fetchBranches();
      } else {
        toast.error(d.error || 'Could not delete branch');
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
            Branch Directory &amp; GPS Geofences
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage corporate branch coordinates, staffing allocations, and configurable 50m–100m attendance geofence boundaries.
          </p>
        </div>

        {isElevated && (
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-[#6538ED] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#6538ED]/25 hover:bg-[#562BD4] transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Office Branch</span>
          </button>
        )}
      </div>

      {/* Live Map of Registered Branches */}
      {!loading && branches.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0F122B]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#6538ED]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Corporate Branch Network Map ({branches.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Interactive geofence zones</span>
          </div>
          <LiveGeofenceMap
            officeLocations={branches.map((b) => ({
              id: b.id,
              name: b.name,
              code: b.code,
              latitude: Number(b.latitude),
              longitude: Number(b.longitude),
              radiusMeters: Number(b.radiusMeters) || 50,
              assignedEmployeesCount: b._count?.employees || 0,
            }))}
            punchMarkers={[]}
            activeFilter="OFFICES"
            className="h-72 rounded-2xl"
          />
        </div>
      )}

      {loading ? (
        <SkeletonCards count={4} />
      ) : branches.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No branches configured"
          description="Add your first headquarters or regional hub to enable employee check-ins and branch reporting."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {branches.map((b) => (
            <div
              key={b.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0F122B]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6538ED]/10 text-[#6538ED]">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</h3>
                    <p className="text-[11px] font-mono text-slate-400">{b.code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {b.radiusMeters}m Radius
                  </span>
                  {isElevated && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        title="Edit branch"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#6538ED] dark:hover:bg-slate-800"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        title="Delete branch"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                <p className="font-semibold">{b.address}</p>
                <p className="text-[11px] text-slate-400">
                  {b.city}, {b.country}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">Latitude</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{b.latitude}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">Longitude</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{b.longitude}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <span className="text-slate-400">Staff Assigned</span>
                <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                  <Users className="h-3.5 w-3.5 text-[#6538ED]" />
                  {b._count?.employees || 0} employees
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingBranch ? 'Edit Branch & Geofence' : 'Register Office Branch'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Salman Central Hub"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BLR-HQ"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Physical Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Street, Building, Sector..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Latitude *</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Longitude *</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Radius (Meters) *</label>
                  <select
                    value={form.radiusMeters}
                    onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value={50}>50m (Strict)</option>
                    <option value={75}>75m (Standard)</option>
                    <option value={100}>100m (Campus)</option>
                    <option value={150}>150m (Yard)</option>
                    <option value={250}>250m (Wide Hub)</option>
                  </select>
                </div>
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
                  {saving ? 'Saving...' : editingBranch ? 'Save Changes' : 'Save Branch & Geofence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
