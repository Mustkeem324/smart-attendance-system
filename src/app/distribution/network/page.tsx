'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Network, MapPin, Building2, Store, RefreshCw, Plus, X, ArrowRight } from 'lucide-react';
import { useUi } from '@/components/providers/UiProvider';
import { useAuth } from '@/context/AuthContext';

export default function NetworkPage() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: 'Karnataka',
  });

  const isAdmin = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(user.role);

  const loadNetwork = async () => {
    setLoading(true);
    try {
      const [whRes, retRes] = await Promise.all([
        fetch('/api/v1/warehouses'),
        fetch('/api/electronics/retailers'),
      ]);
      const whData = await whRes.json();
      const retData = await retRes.json();
      if (whData.success) setWarehouses(Array.isArray(whData.data) ? whData.data : []);
      if (retData.success) setRetailers(Array.isArray(retData.retailers) ? retData.retailers : []);
    } catch {
      toast.error('Failed to load distribution network topology');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetwork();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not add distribution hub');
      } else {
        toast.success('Warehouse node added to network.');
        setShowAdd(false);
        setForm({ name: '', code: '', address: '', city: '', state: 'Karnataka' });
        loadNetwork();
      }
    } catch {
      toast.error('Failed to add distribution hub');
    } finally {
      setSaving(false);
    }
  };

  const countRetailersInCity = (city: string) => {
    const c = (city || '').toLowerCase();
    if (!c) return 0;
    return retailers.filter((r) => (r.city || '').toLowerCase().includes(c)).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-[#8255FF]" />
            Distribution Network Topology
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live warehouse fulfillment hubs, regional stock valuation, and connected retail dealer density.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadNetwork}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#151A38] border border-[#23294E] text-xs font-semibold text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] text-xs font-bold text-white shadow-lg shadow-[#6538ED]/25"
            >
              <Plus className="w-4 h-4" /> Register Hub
            </button>
          )}
        </div>
      </div>

      {/* Live Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E]">
          <p className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#8255FF]" /> Active Warehouses
          </p>
          <p className="text-2xl font-black text-white mt-1">{warehouses.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E]">
          <p className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-[#12B886]" /> Total Registered Retailers
          </p>
          <p className="text-2xl font-black text-white mt-1">{retailers.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E]">
          <p className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> Network Cities Covered
          </p>
          <p className="text-2xl font-black text-white mt-1">
            {new Set(warehouses.map((w) => (w.city || '').trim().toLowerCase()).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-[#8255FF] mx-auto mb-2" />
          Loading warehouse and dealer network...
        </div>
      ) : warehouses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2A315E] bg-[#151A38] p-12 text-center space-y-2">
          <Building2 className="w-10 h-10 text-[#8255FF] mx-auto opacity-80" />
          <h2 className="text-base font-bold text-white">No Distribution Hubs Configured</h2>
          <p className="text-xs text-slate-400">
            Add regional warehouses to map stock holdings and dealer cluster coverage.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warehouses.map((hub) => {
            const matchedDealers = countRetailersInCity(hub.city);
            return (
              <div
                key={hub._id}
                className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-300 px-2.5 py-1 rounded bg-[#6538ED]/15 border border-[#6538ED]/30">
                    {hub.code}
                  </span>
                  <span className="text-[10px] text-[#12B886] bg-[#12B886]/10 border border-[#12B886]/20 px-2 py-0.5 rounded-full font-bold">
                    Active Fulfillment Node
                  </span>
                </div>

                <h3 className="font-bold text-white text-base">{hub.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {hub.address} &bull; {hub.city}, {hub.state}
                </p>

                <div className="pt-3 border-t border-[#23294E]/60 grid grid-cols-3 gap-2 text-xs text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stocked Units</span>
                    <span className="font-bold text-white">
                      {Number(hub.totalUnits || 0).toLocaleString('en-IN')} ({hub.totalSkus || 0} SKUs)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stock Valuation</span>
                    <span className="font-bold text-[#8255FF]">
                      ₹{Number(hub.totalValuation || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">City Retailers</span>
                    <span className="font-bold text-[#12B886]">{matchedDealers} Dealers</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    href="/distribution/warehouses"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8255FF] hover:underline"
                  >
                    Manage Warehouse Stock <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#15172B] border border-[#252A54] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#23294E] pb-3">
              <h2 className="text-base font-bold text-white">Register Warehouse Node</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Hub Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Mysore Regional Warehouse"
                  className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Code *</label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WH-MYS-01"
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City *</label>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="City"
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Address *</label>
                <input
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Facility street and industrial area..."
                  className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A2E5A] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] font-bold text-white disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Save Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
