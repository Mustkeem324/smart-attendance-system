'use client';

import React, { useState, useEffect } from 'react';
import { Award, RefreshCw, CheckCircle2, Plus, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';

export default function BrandsPage() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    tier: 'AUTHORIZED_TIER_1',
    authorizedMarginPercent: '12',
    description: '',
  });

  const isAdmin = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER'].includes(user.role);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/brands');
      if (res.ok) {
        const json = await res.json();
        setBrands(json.data || []);
      }
    } catch {
      toast.error('Failed to load brand partners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Could not register brand partner');
      } else {
        toast.success('Brand partner registered.');
        setShowAdd(false);
        setForm({
          name: '',
          code: '',
          tier: 'AUTHORIZED_TIER_1',
          authorizedMarginPercent: '12',
          description: '',
        });
        loadBrands();
      }
    } catch {
      toast.error('Network error registering brand partner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-[#8255FF]" />
            Authorized Brand Partners &amp; Distribution Tiers
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Master distribution agreements, official brand tier authorizations, and dealer wholesale margin slabs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBrands}
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
              <Plus className="w-4 h-4" /> Register Brand
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-[#8255FF] mx-auto mb-2" />
          Loading partner brands...
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2A315E] bg-[#151A38] p-12 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-[#8255FF] mx-auto opacity-80" />
          <h2 className="text-base font-bold text-white">No Brand Agreements Registered</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Register authorized OEM brands to track active SKU models, wholesale margin slabs, and tier authorizations.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] text-xs font-bold text-white"
            >
              <Plus className="w-4 h-4" /> Add First Brand Partner
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((b) => (
            <div
              key={b._id}
              className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-[#8255FF]/40 transition-all shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="px-2.5 py-1 rounded-lg bg-[#6538ED]/15 border border-[#6538ED]/30 text-purple-300 font-mono font-bold text-xs">
                    {b.code}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#12B886] border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {b.tier?.replace(/_/g, ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-white text-lg mt-3 group-hover:text-purple-300 transition-colors">
                  {b.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {b.description || 'Authorized national B2B distribution agreement.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#23294E]/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Active Models</span>
                  <span className="font-bold text-white text-sm">{b.activeModelsCount || 0} Models</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Authorized Margin</span>
                  <span className="font-bold text-[#12B886] text-sm">{b.authorizedMarginPercent}% SLA</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#15172B] border border-[#252A54] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#23294E] pb-3">
              <h2 className="text-base font-bold text-white">Register Brand Partner</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Brand Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Samsung"
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Brand Code *</label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SAM"
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none focus:border-[#6538ED]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Authorization Tier</label>
                  <select
                    value={form.tier}
                    onChange={(e) => setForm({ ...form, tier: e.target.value })}
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none"
                  >
                    <option value="AUTHORIZED_TIER_1">Authorized Tier 1</option>
                    <option value="REGIONAL_PARTNER">Regional Partner</option>
                    <option value="MASTER_DISTRIBUTOR">Master Distributor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Margin Slab (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={form.authorizedMarginPercent}
                    onChange={(e) => setForm({ ...form, authorizedMarginPercent: e.target.value })}
                    className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Agreement Scope</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Authorized device lines, warranty terms, and territory..."
                  className="w-full rounded-xl bg-[#0C0E22] border border-[#2A2E5A] px-3 py-2 text-white outline-none"
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
                  {saving ? 'Registering...' : 'Save Brand Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
