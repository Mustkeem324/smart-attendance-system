'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  MapPin,
  PlusCircle,
  Users,
  Navigation,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  Compass,
  Building,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function OfficeLocationsPage() {
  const { user } = useAuth();
  const [offices, setOffices] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<any | null>(null);
  const [selectedOfficeForMap, setSelectedOfficeForMap] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    branchId: '',
    latitude: 28.6139,
    longitude: 77.2090,
    radiusMeters: 50,
    minGpsAccuracyMeters: 30,
    allowedTimeWindows: '06:00-23:00',
    isActive: true,
  });

  const fetchOffices = useCallback(async () => {
    try {
      const [offRes, branchRes, empRes] = await Promise.all([
        fetch('/api/admin/office-locations'),
        fetch('/api/branches'),
        fetch('/api/employees'),
      ]);

      const offData = await offRes.json();
      const branchData = await branchRes.json();
      const empData = await empRes.json();

      setOffices(offData.officeLocations || []);
      setBranches(branchData.branches || []);
      setEmployees(empData.employees || []);

      if (offData.officeLocations?.length > 0) {
        setSelectedOfficeForMap((prev: any) => prev || offData.officeLocations[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  const handleOpenAdd = () => {
    setEditingOffice(null);
    setForm({
      name: '',
      code: '',
      address: '',
      branchId: branches[0]?.id || '',
      latitude: 28.6139,
      longitude: 77.2090,
      radiusMeters: 50,
      minGpsAccuracyMeters: 30,
      allowedTimeWindows: '06:00-23:00',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (office: any) => {
    setEditingOffice(office);
    setForm({
      name: office.name,
      code: office.code,
      address: office.address,
      branchId: office.branchId || '',
      latitude: office.latitude,
      longitude: office.longitude,
      radiusMeters: office.radiusMeters,
      minGpsAccuracyMeters: office.minGpsAccuracyMeters,
      allowedTimeWindows: office.allowedTimeWindows || '06:00-23:00',
      isActive: office.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingOffice
        ? `/api/admin/office-locations/${editingOffice.id}`
        : '/api/admin/office-locations';
      const method = editingOffice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchOffices();
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Office Locations & Geofence Boundaries
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure multi-office GPS coordinates, 50m/100m/custom radiuses, and minimum accuracy thresholds.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-700"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Office Location</span>
        </button>
      </div>

      {/* Interactive Map Visualizer & Office List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Visual Map / Geofence Radar Container */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Interactive Office Geofence Map
              </h2>
            </div>
            {selectedOfficeForMap && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                Viewing: {selectedOfficeForMap.name} ({selectedOfficeForMap.radiusMeters}m radius)
              </span>
            )}
          </div>

          {/* Interactive SVG Radar Map View */}
          <div className="relative mt-6 flex h-80 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-4">
            {/* Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-70"></div>

            {selectedOfficeForMap ? (
              <div className="relative flex flex-col items-center">
                {/* Geofence Outer Radius Ring */}
                <div
                  style={{
                    width: `${Math.min(260, selectedOfficeForMap.radiusMeters * 2.8)}px`,
                    height: `${Math.min(260, selectedOfficeForMap.radiusMeters * 2.8)}px`,
                  }}
                  className="animate-pulse-ring flex items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                >
                  {/* Inner Target Ring */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-emerald-300 bg-emerald-500/20">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* Marker Card Overlay */}
                <div className="absolute -bottom-10 rounded-xl bg-slate-900/90 px-4 py-2 text-center text-xs text-white backdrop-blur shadow-xl border border-slate-800">
                  <span className="font-bold text-emerald-400">{selectedOfficeForMap.name}</span>
                  <p className="text-[10px] text-slate-300">
                    Lat: {selectedOfficeForMap.latitude.toFixed(4)}, Lon: {selectedOfficeForMap.longitude.toFixed(4)}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Enforcing {selectedOfficeForMap.radiusMeters}m Geofence • Min Accuracy ±{selectedOfficeForMap.minGpsAccuracyMeters}m
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Select an office location below to inspect geofence</p>
            )}

            {/* Map Controls */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] text-white backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Geofence Simulator Active</span>
            </div>
          </div>
        </div>

        {/* Quick Office Selection Column */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Office Locations</h2>
            <p className="text-xs text-slate-400">Click to focus on radar map</p>

            <div className="mt-4 space-y-3">
              {offices.map((off) => (
                <div
                  key={off.id}
                  onClick={() => setSelectedOfficeForMap(off)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    selectedOfficeForMap?.id === off.id
                      ? 'border-brand-500 bg-brand-50/60 shadow-sm dark:border-brand-500 dark:bg-brand-950/40'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{off.name}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {off.radiusMeters}m Radius
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">{off.address}</p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span>Staff: {off._count?.employees || 0}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(off);
                      }}
                      className="flex items-center gap-1 font-semibold text-brand-600 hover:underline"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Office Locations Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Registered Office Premises & Configuration
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5">Office Name & Code</th>
                <th className="px-5 py-3.5">Branch</th>
                <th className="px-5 py-3.5">Address</th>
                <th className="px-5 py-3.5">Coordinates (Lat, Lon)</th>
                <th className="px-5 py-3.5">Geofence Radius</th>
                <th className="px-5 py-3.5">Min Accuracy</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">Loading offices...</td>
                </tr>
              ) : offices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">No offices registered.</td>
                </tr>
              ) : (
                offices.map((off) => (
                  <tr key={off.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="font-bold text-slate-900 dark:text-white">{off.name}</span>
                      <p className="text-[11px] text-slate-400">{off.code}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {off.branch?.name || '--'}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {off.address}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {off.latitude.toFixed(5)}, {off.longitude.toFixed(5)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {off.radiusMeters}m
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      ±{off.minGpsAccuracyMeters}m
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenEdit(off)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingOffice ? 'Edit Office Geofence' : 'Register New Office Location'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Office Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Floor 4 Innovation Suite"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Office Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OFF-01"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Street and building location..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Belongs to Branch</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                >
                  <option value="">No branch attached</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Latitude (GPS) *</label>
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Longitude (GPS) *</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Geofence Radius (Meters) *</label>
                  <select
                    value={form.radiusMeters}
                    onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  >
                    <option value={30}>30 metres</option>
                    <option value={50}>50 metres (Standard)</option>
                    <option value={100}>100 metres (Tech Park Campus)</option>
                    <option value={150}>150 metres</option>
                    <option value={200}>200 metres</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Min GPS Accuracy (±Meters) *</label>
                  <input
                    type="number"
                    required
                    value={form.minGpsAccuracyMeters}
                    onChange={(e) => setForm({ ...form, minGpsAccuracyMeters: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
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
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  {editingOffice ? 'Update Geofence' : 'Save Office'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
