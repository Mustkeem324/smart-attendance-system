'use client';

import React, { useState, useEffect } from 'react';
import { Award, RefreshCw, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/brands');
        if (res.ok) {
          const json = await res.json();
          setBrands(json.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-400" />
            Authorized Brand Partners & Distribution Tiers
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Master distribution agreements, official brand tier authorizations, and dealer wholesale margin slabs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Loading partner brands...
          </div>
        ) : (
          brands.map((b) => (
            <div
              key={b._id}
              className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/40 transition-all shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono font-bold text-xs">
                    {b.code}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {b.tier?.replace(/_/g, ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-white text-lg mt-3 group-hover:text-purple-300 transition-colors">
                  {b.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{b.description}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#23294E]/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Active Models:</span>
                  <span className="font-bold text-white text-sm">{b.activeModelsCount || 0} Models</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Authorized Margin:</span>
                  <span className="font-bold text-emerald-400 text-sm">{b.authorizedMarginPercent}% SLA</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
