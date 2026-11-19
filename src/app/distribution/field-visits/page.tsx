'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, RefreshCw, CheckCircle2, Clock, Store, AlertCircle } from 'lucide-react';

export default function FieldVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/field-visits');
        if (res.ok) {
          const json = await res.json();
          setVisits(json.data || []);
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
      <div className="pb-2 border-b border-[#23294E]">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-purple-400" />
          Field Visits & Geofence Verification
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time GPS check-ins, distance accuracy calculation, retailer interaction logs and replenishment notes.
        </p>
      </div>

      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Visit Date & Time</th>
                <th className="py-3 px-4">Retailer Showroom</th>
                <th className="py-3 px-4">Location & Coordinates</th>
                <th className="py-3 px-4">Distance from Shop</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Geofence Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Loading field visit telemetry...
                  </td>
                </tr>
              ) : visits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No field visits recorded yet.
                  </td>
                </tr>
              ) : (
                visits.map((v) => {
                  const ret = v.retailerId || {};
                  return (
                    <tr key={v._id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">{v.visitDate}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{ret.name || 'Store'}</div>
                        <div className="text-[10px] text-purple-400 font-mono">{ret.dealerCode}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {v.latitude?.toFixed(4)}, {v.longitude?.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        {v.distanceFromShopMeters || 0}m away
                      </td>
                      <td className="py-3 px-4 text-slate-300">{v.visitPurpose}</td>
                      <td className="py-3 px-4">
                        {v.isWithinGeofence ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            GEOFENCE VERIFIED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" />
                            OUTSIDE GEOFENCE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
