'use client';

import React from 'react';
import { Tag, Sparkles, Percent, Calendar, CheckCircle2 } from 'lucide-react';

export default function PromotionsPage() {
  const schemes = [
    {
      code: 'TIER1-FLAGSHIP-5',
      title: 'Flagship Smartphone Bulk Allocation Rebate',
      description: 'Get an additional 5% margin rebate on bulk orders of 25+ flagship smartphones (iPhone 16 / Galaxy S24).',
      discount: '5% Extra Rebate',
      minUnits: '25 Units',
      minAmount: '₹15,00,000',
      validity: 'Valid till 31 Dec 2026',
      status: 'ACTIVE SCHEME',
    },
    {
      code: 'AUDIO-FEST-12',
      title: 'Wireless Audio & Wearables Channel Booster',
      description: 'Special 12% distributor trade discount for authorized retailers on all Anker, boAt and Sony TWS & smartwatches.',
      discount: '12% Margin Discount',
      minUnits: '20 Units',
      minAmount: '₹50,000',
      validity: 'Valid till 15 Jan 2027',
      status: 'ACTIVE SCHEME',
    },
    {
      code: 'CHARGER-VOLUME-8',
      title: 'Fast Charger GaN Prime Volume Scheme',
      description: 'Exclusive 8% bonus trade credit when ordering 50+ GaN 65W/100W multi-port wall adapters.',
      discount: '8% Credit Note',
      minUnits: '50 Units',
      minAmount: '₹75,000',
      validity: 'Valid till 28 Feb 2027',
      status: 'ACTIVE SCHEME',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[#23294E]">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Tag className="w-6 h-6 text-purple-400" />
          B2B Trade Schemes & Dealer Promotions
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Active distributor trade schemes, volume rebates, festive commercial margin boosters and credit notes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schemes.map((s, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/40 transition-all shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-purple-300 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20">
                  {s.code}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  {s.status}
                </span>
              </div>

              <h3 className="font-bold text-white text-base mt-3">{s.title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.description}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#23294E]/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Trade Benefit:</span>
                <span className="font-bold text-emerald-400">{s.discount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Min Order Requirement:</span>
                <span className="font-semibold text-white">{s.minUnits} ({s.minAmount})</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  {s.validity}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
