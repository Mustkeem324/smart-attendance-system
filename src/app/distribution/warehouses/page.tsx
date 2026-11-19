'use client';

import React, { useState, useEffect } from 'react';
import { Warehouse as WarehouseIcon, RefreshCw, Plus, MapPin, Boxes, X } from 'lucide-react';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: 'Bangalore',
    state: 'Karnataka',
  });

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/warehouses');
      if (res.ok) {
        const json = await res.json();
        setWarehouses(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchWarehouses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-purple-400" />
            Distribution Hubs & Warehouses
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Regional hardware fulfillment centers, stock capacity utilization and inventory valuations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Warehouse Hub</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Loading warehouses...
          </div>
        ) : (
          warehouses.map((wh) => (
            <div
              key={wh._id}
              className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 font-mono font-bold text-xs border border-purple-500/20">
                    {wh.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    OPERATIONAL
                  </span>
                </div>

                <h3 className="font-bold text-white text-base mt-3">{wh.name}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{wh.address}, {wh.city}, {wh.state}</span>
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#23294E]/60 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Unique SKUs</span>
                  <span className="font-bold text-white">{wh.totalSkus || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Units</span>
                  <span className="font-bold text-white">{wh.totalUnits || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Valuation</span>
                  <span className="font-bold text-emerald-400 text-[11px] truncate block">
                    {formatCurrency(wh.totalValuation || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <h2 className="text-base font-bold text-white">Register Distribution Hub</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Hub Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex South Regional Hub"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Hub Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH-BLR-02"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                />
              </div>

              <div className="pt-3 border-t border-[#23294E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#10132A] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] text-white font-semibold"
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
