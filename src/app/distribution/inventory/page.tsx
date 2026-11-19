'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  ArrowRightLeft,
  SlidersHorizontal,
  Warehouse,
  AlertTriangle,
  RefreshCw,
  X,
  Plus,
  CheckCircle2,
} from 'lucide-react';

export default function InventoryPage() {
  const [inventories, setInventories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Transfer Form
  const [transferData, setTransferData] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    productId: '',
    quantity: '5',
    notes: 'Inter-hub replenishment',
  });

  // Adjust Form
  const [adjustData, setAdjustData] = useState({
    warehouseId: '',
    productId: '',
    adjustmentType: 'PURCHASE_INWARD',
    quantity: '20',
    notes: 'Manufacturer batch inward',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/inventory', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (warehouseFilter !== 'ALL') url.searchParams.set('warehouseId', warehouseFilter);
      if (lowStockOnly) url.searchParams.set('lowStockOnly', 'true');

      const [invRes, whRes] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/v1/warehouses'),
      ]);

      if (invRes.ok) {
        const json = await invRes.json();
        setInventories(json.data || []);
      }
      if (whRes.ok) {
        const whJson = await whRes.json();
        setWarehouses(whJson.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [warehouseFilter, lowStockOnly]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData),
      });
      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error || 'Transfer failed');
      } else {
        setShowTransferModal(false);
        fetchData();
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustData),
      });
      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error || 'Adjustment failed');
      } else {
        setShowAdjustModal(false);
        fetchData();
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-purple-400" />
            Multi-Warehouse Inventory Stock
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time stock reservation, inter-hub transfers, minimum reorder thresholds and device serial telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (warehouses.length > 0 && inventories.length > 0) {
                setTransferData({
                  fromWarehouseId: warehouses[0]._id,
                  toWarehouseId: warehouses[1]?._id || warehouses[0]._id,
                  productId: inventories[0].productId?._id,
                  quantity: '5',
                  notes: 'Inter-hub replenishment',
                });
              }
              setShowTransferModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E2552] hover:bg-[#28326D] text-white text-xs font-semibold border border-purple-500/30 transition-all"
          >
            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
            <span>Stock Transfer</span>
          </button>
          <button
            onClick={() => {
              if (warehouses.length > 0 && inventories.length > 0) {
                setAdjustData({
                  warehouseId: warehouses[0]._id,
                  productId: inventories[0].productId?._id,
                  adjustmentType: 'PURCHASE_INWARD',
                  quantity: '20',
                  notes: 'Manufacturer batch inward',
                });
              }
              setShowAdjustModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Inward / Adjust Stock</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by hardware name, SKU or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#10132A] border border-[#23294E] focus:border-purple-500 text-xs text-white placeholder-slate-400 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Warehouse Selector */}
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Warehouses & Hubs</option>
            {warehouses.map((wh) => (
              <option key={wh._id} value={wh._id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              lowStockOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#10132A] text-slate-300 border-[#23294E] hover:border-slate-500'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alerts</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Hardware SKU & Model</th>
                <th className="py-3 px-4">Warehouse Location</th>
                <th className="py-3 px-4">Available Units</th>
                <th className="py-3 px-4">Allocated / Reserved</th>
                <th className="py-3 px-4">On Hand Total</th>
                <th className="py-3 px-4">Wholesale Valuation</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Loading inventory records from MongoDB...
                  </td>
                </tr>
              ) : inventories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No inventory records match the current filter.
                  </td>
                </tr>
              ) : (
                inventories.map((inv) => {
                  const p = inv.productId || {};
                  const wh = inv.warehouseId || {};
                  const valuation = (inv.availableStock || 0) * (p.dealerPrice || 0);
                  const isLow = inv.availableStock <= (inv.minimumThreshold || 10);

                  return (
                    <tr key={inv._id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{p.name || 'Electronic Hardware'}</div>
                        <div className="text-[10px] text-purple-400 font-mono font-medium">SKU: {p.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{wh.name || 'Central Hub'}</div>
                        <div className="text-[10px] text-slate-400">{wh.city || 'Bangalore'} • {wh.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white text-sm">{inv.availableStock}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-400">{inv.allocatedStock || 0} units</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-300">
                        {inv.onHandStock || inv.availableStock}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        {formatCurrency(valuation)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            !isLow
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {isLow ? 'REORDER NEEDED' : 'HEALTHY'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                Inter-Hub Stock Transfer
              </h2>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleTransfer} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Source Warehouse</label>
                <select
                  value={transferData.fromWarehouseId}
                  onChange={(e) => setTransferData({ ...transferData, fromWarehouseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>{wh.name} ({wh.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Destination Warehouse</label>
                <select
                  value={transferData.toWarehouseId}
                  onChange={(e) => setTransferData({ ...transferData, toWarehouseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>{wh.name} ({wh.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Hardware Product</label>
                <select
                  value={transferData.productId}
                  onChange={(e) => setTransferData({ ...transferData, productId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {inventories.map((inv) => (
                    <option key={inv._id} value={inv.productId?._id}>
                      {inv.productId?.name} ({inv.productId?.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Transfer Quantity (Units)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#23294E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#10132A] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Executing Transfer...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust / Inward Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Inward Stock Replenishment
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAdjust} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Warehouse</label>
                <select
                  value={adjustData.warehouseId}
                  onChange={(e) => setAdjustData({ ...adjustData, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>{wh.name} ({wh.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Product</label>
                <select
                  value={adjustData.productId}
                  onChange={(e) => setAdjustData({ ...adjustData, productId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {inventories.map((inv) => (
                    <option key={inv._id} value={inv.productId?._id}>
                      {inv.productId?.name} ({inv.productId?.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Inward Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#23294E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#10132A] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Inwarding...' : 'Record Inward Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
