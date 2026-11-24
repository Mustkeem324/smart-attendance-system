'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, PlusCircle, Users, Navigation, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function BranchesPage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    city: 'New Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
    radiusMeters: 50,
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        fetchBranches();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to add branch');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Office Locations & GPS Geofences
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define corporate branch GPS coordinates, addresses, and individual geofence radiuses (50m, 100m, or custom).
          </p>
        </div>

        {isElevated && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-700"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Office Branch</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading branches...</div>
        ) : (
          branches.map((b) => (
            <div
              key={b.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</h3>
                    <p className="text-[11px] text-slate-400">{b.code}</p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {b.radiusMeters}m Geofence Radius
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                <p className="font-semibold">{b.address}</p>
                <p className="text-[11px] text-slate-400">{b.city}, {b.country}</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">Latitude:</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{b.latitude}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">Longitude:</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{b.longitude}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <span className="text-slate-400">Staff Assigned:</span>
                <span className="font-bold text-slate-900 dark:text-white">{b._count?.employees || 0} employees</span>
              </div>
            </div>
          ))
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 ">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Register Office Geofence</h2>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Office Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Tech Campus"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Branch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HQ-01"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Physical Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Street, Building, Sector..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Latitude *</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none dark:border-slate-800 dark:bg-slate-800"
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
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Geofence (Meters) *</label>
                  <input
                    type="number"
                    required
                    value={form.radiusMeters}
                    onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
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
                  Save Branch & Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
