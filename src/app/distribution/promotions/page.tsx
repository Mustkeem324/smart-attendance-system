'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Plus, Calendar, Trash2, Power, X, RefreshCw } from 'lucide-react';
import { useUi } from '@/components/providers/UiProvider';
import { useAuth } from '@/context/AuthContext';

export default function PromotionsPage() {
  const { user } = useAuth();
  const { toast, confirm } = useUi();
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    category: 'ALL',
    discountType: 'PERCENTAGE',
    discountValue: '5',
    minOrderUnits: '10',
    minOrderAmount: '50000',
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });

  const canManage =
    user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER'].includes(user.role);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/promotions');
      const data = await res.json();
      if (data.success) {
        setSchemes(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      toast.error('Failed to load trade promotion schemes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not create promotion');
      } else {
        toast.success('Trade promotion scheme launched.');
        setShowAdd(false);
        setForm({
          code: '',
          title: '',
          description: '',
          category: 'ALL',
          discountType: 'PERCENTAGE',
          discountValue: '5',
          minOrderUnits: '10',
          minOrderAmount: '50000',
          validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        });
        loadPromotions();
      }
    } catch {
      toast.error('Network error creating promotion');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (promo: any) => {
    try {
      const res = await fetch(`/api/v1/promotions/${promo._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !promo.isActive }),
      });
      if (res.ok) {
        toast.success(`Scheme ${!promo.isActive ? 'activated' : 'paused'}.`);
        loadPromotions();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Update failed');
      }
    } catch {
      toast.error('Failed to update scheme status');
    }
  };

  const handleDelete = async (promo: any) => {
    const ok = await confirm({
      title: 'Delete Promotion Scheme',
      message: `Remove campaign "${promo.title}" (${promo.code})?`,
      confirmText: 'Delete Scheme',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/v1/promotions/${promo._id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Promotion deleted.');
        loadPromotions();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Delete failed');
      }
    } catch {
      toast.error('Failed to delete promotion');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-[#8255FF]" />
            Trade Promotions &amp; B2B Schemes
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active retailer volume discounts, bundled accessories incentives and trade rebate campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPromotions}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#151A38] border border-[#23294E] text-xs font-semibold text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] text-xs font-bold text-white shadow-lg shadow-[#6538ED]/25"
            >
              <Plus className="w-4 h-4" /> Create Scheme
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-[#8255FF] mx-auto mb-2" />
          Loading active trade campaigns...
        </div>
      ) : schemes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2A315E] bg-[#151A38] p-12 text-center space-y-3">
          <Gift className="w-10 h-10 text-[#8255FF] mx-auto opacity-80" />
          <h2 className="text-base font-bold text-white">No Promotion Campaigns Configured</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create dealer volume rebates or festive product schemes to incentivize retail showroom bookings.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] text-xs font-bold text-white"
            >
              <Plus className="w-4 h-4" /> Launch First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemes.map((s) => (
            <div
              key={s._id}
              className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-purple-300 px-2.5 py-1 rounded bg-[#6538ED]/15 border border-[#6538ED]/30">
                    {s.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        s.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-700/40 text-slate-400 border-slate-600/30'
                      }`}
                    >
                      {s.isActive ? 'ACTIVE' : 'PAUSED'}
                    </span>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(s)}
                          title={s.isActive ? 'Pause campaign' : 'Activate campaign'}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          title="Delete campaign"
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-white text-base mt-3">{s.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.description}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#23294E]/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Trade Benefit:</span>
                  <span className="font-bold text-[#12B886]">
                    {s.discountType === 'FLAT_AMOUNT'
                      ? `₹${Number(s.discountValue).toLocaleString('en-IN')} Off`
                      : `${s.discountValue}% Trade Rebate`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Minimum Qualifying Order:</span>
                  <span className="font-semibold text-white">
                    {s.minOrderUnits} Units / ₹{Number(s.minOrderAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#8255FF]" />
                    Valid until {new Date(s.validUntil).toLocaleDateString()}
                  </span>
                  <span className="text-slate-300 font-semibold">{s.category || 'ALL'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#15172B] border border-[#252A54] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#23294E] pb-3">
              <h2 className="text-base font-bold text-white">Create B2B Trade Promotion</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Promo Code *</label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. FESTIVE5"
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category Scope</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                  >
                    <option value="ALL">All Products</option>
                    <option value="SMARTPHONES">Smartphones</option>
                    <option value="TABLETS">Tablets</option>
                    <option value="SMARTWATCHES">Smartwatches</option>
                    <option value="EARBUDS">Wireless Earbuds</option>
                    <option value="ACCESSORIES">Accessories</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Campaign Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Q4 Retail Volume Rebate"
                  className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Scheme Rules &amp; Description *</label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Terms, eligible SKUs, and settlement cycle..."
                  className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Benefit Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                  >
                    <option value="PERCENTAGE">Percentage Rebate (%)</option>
                    <option value="FLAT_AMOUNT">Flat Invoice Discount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Min Units</label>
                  <input
                    type="number"
                    min="1"
                    value={form.minOrderUnits}
                    onChange={(e) => setForm({ ...form, minOrderUnits: e.target.value })}
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Min Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A2E5A] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] font-bold text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Launch Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
