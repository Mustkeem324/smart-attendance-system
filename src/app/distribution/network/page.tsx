'use client';

import React from 'react';
import { Network, MapPin, Building2, Truck, CheckCircle2 } from 'lucide-react';

export default function NetworkPage() {
  const hubs = [
    {
      city: 'Bangalore (HQ Central Hub)',
      code: 'WH-BLR-01',
      coverage: 'Central Business District, SP Road, Electronic City, Whitefield, Indiranagar',
      capacity: '40,000 Units',
      status: 'Active Tier 1 Master Hub',
      dealers: 42,
    },
    {
      city: 'Mysore Regional Facility',
      code: 'WH-MYS-01',
      coverage: 'Mysore City, Mandya, Hassan, Chamarajanagar',
      capacity: '15,000 Units',
      status: 'Active Regional Sub-Hub',
      dealers: 18,
    },
    {
      city: 'Hubli-Dharwad Logistics Node',
      code: 'WH-HBL-01',
      coverage: 'Hubli, Dharwad, Belgaum, Davanagere corridor',
      capacity: '20,000 Units',
      status: 'Active Regional Sub-Hub',
      dealers: 24,
    },
    {
      city: 'Mangalore Coastal Hub',
      code: 'WH-MNG-01',
      coverage: 'Mangalore, Udupi, Manipal, Coastal Karnataka electronics belt',
      capacity: '18,000 Units',
      status: 'Active Regional Sub-Hub',
      dealers: 19,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[#23294E]">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Network className="w-6 h-6 text-purple-400" />
          Regional Distribution Network Topology
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Distribution topology, warehouse fulfillment coverage, transit lanes and dealer density clusters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hubs.map((hub, i) => (
          <div key={i} className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-purple-300 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20">
                {hub.code}
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                {hub.status}
              </span>
            </div>

            <h3 className="font-bold text-white text-base">{hub.city}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-medium">Coverage Area:</span> {hub.coverage}
            </p>

            <div className="pt-3 border-t border-[#23294E]/60 flex items-center justify-between text-xs text-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 block">Hub Capacity</span>
                <span className="font-semibold text-white">{hub.capacity}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Active Dealers Connected</span>
                <span className="font-bold text-emerald-400">{hub.dealers} Showrooms</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
