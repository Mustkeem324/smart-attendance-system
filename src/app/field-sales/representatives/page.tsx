'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Store,
  MapPin,
  TrendingUp,
  Target,
  DollarSign,
  Truck,
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  Compass,
} from 'lucide-react';

export default function SalesRepresentativesPage() {
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRep, setSelectedRep] = useState<any>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    territory: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    commissionRatePercent: 2.5,
    dailyVisitTarget: 10,
    monthlySalesTarget: 100000,
  });

  const fetchRepresentatives = async () => {
    try {
      const res = await fetch('/api/sales/representatives');
      if (res.ok) {
        const data = await res.json();
        setRepresentatives(data.representatives || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepresentatives();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep) return;
    try {
      const res = await fetch('/api/sales/representatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedRep.id, ...profileForm }),
      });
      if (res.ok) {
        setIsEditProfileOpen(false);
        fetchRepresentatives();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openProfileModal = (rep: any) => {
    setSelectedRep(rep);
    setProfileForm({
      territory: rep.territory || 'Central Zone',
      vehicleType: rep.vehicleType || 'Bike',
      vehicleNumber: '',
      commissionRatePercent: rep.commissionRate || 2.5,
      dailyVisitTarget: 10,
      monthlySalesTarget: rep.target?.targetTurnover || 100000,
    });
    setIsEditProfileOpen(true);
  };

  const filteredReps = representatives.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      r.employeeCode.toLowerCase().includes(term) ||
      r.territory.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Sales Representatives &amp; Territory Management
            </h1>
            <span className="rounded-full bg-[#5428E8]/10 px-2.5 py-0.5 text-xs font-bold text-[#5428E8]">
              {representatives.length} Active Field Reps
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Field representative performance, assigned retailer portfolios, monthly target achievement, and commission tracking
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xs max-w-md">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, employee code, territory..."
          className="w-full bg-transparent focus:outline-none"
        />
      </div>

      {/* Representatives Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading sales representatives...</div>
        ) : filteredReps.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">No representatives found.</div>
        ) : (
          filteredReps.map((rep) => (
            <div
              key={rep.id}
              className="rounded-3xl border border-[#E6E8F2] bg-white p-5 shadow-xs transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5428E8]/10 text-base font-black text-[#5428E8]">
                    {rep.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{rep.name}</h3>
                    <p className="text-[11px] text-slate-400">{rep.designation} • {rep.employeeCode}</p>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold text-[#5428E8]">
                      Territory: {rep.territory}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#F6F5FF] p-3 text-center text-xs">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Shops</p>
                  <p className="font-bold text-slate-900">{rep.assignedShopsCount}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Deliveries</p>
                  <p className="font-bold text-indigo-600">{rep.deliveriesCompleted}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Sales Value</p>
                  <p className="font-mono font-bold text-slate-900">₹{rep.totalTurnover.toLocaleString()}</p>
                </div>
              </div>

              {/* Target Progress Bar */}
              {rep.target && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>Monthly Target</span>
                    <span className="text-[#5428E8]">{rep.target.progressPercent}% achieved</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5428E8] transition-all duration-500"
                      style={{ width: `${rep.target.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>₹{rep.totalTurnover.toLocaleString()}</span>
                    <span>Target: ₹{rep.target.targetTurnover.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-[11px] text-emerald-600 font-semibold">
                  Collections: ₹{rep.totalPaymentCollected.toLocaleString()}
                </span>
                <button
                  onClick={() => openProfileModal(rep)}
                  className="rounded-xl border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Configure
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Configure Rep Profile */}
      {isEditProfileOpen && selectedRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Configure Territory</span>
                <h3 className="text-base font-bold text-slate-900">{selectedRep.name}</h3>
              </div>
              <button onClick={() => setIsEditProfileOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Territory *</label>
                <input
                  type="text"
                  required
                  value={profileForm.territory}
                  onChange={(e) => setProfileForm({ ...profileForm, territory: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-[#5428E8] focus:outline-none"
                  placeholder="e.g. North Zone - Indiranagar"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Type</label>
                  <select
                    value={profileForm.vehicleType}
                    onChange={(e) => setProfileForm({ ...profileForm, vehicleType: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                  >
                    <option value="Bike">Motorcycle / Scooter</option>
                    <option value="Van">Delivery Van</option>
                    <option value="Car">Car</option>
                    <option value="Auto">Three Wheeler</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profileForm.commissionRatePercent}
                    onChange={(e) => setProfileForm({ ...profileForm, commissionRatePercent: parseFloat(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Daily Visit Target</label>
                  <input
                    type="number"
                    value={profileForm.dailyVisitTarget}
                    onChange={(e) => setProfileForm({ ...profileForm, dailyVisitTarget: parseInt(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly Sales Target (₹)</label>
                  <input
                    type="number"
                    value={profileForm.monthlySalesTarget}
                    onChange={(e) => setProfileForm({ ...profileForm, monthlySalesTarget: parseFloat(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#5428E8]/20 hover:bg-[#431fbd]"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
