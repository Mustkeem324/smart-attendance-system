'use client';

import React, { useState, useEffect } from 'react';
import { Users2, RefreshCw, Mail, Phone, MapPin, Award, CheckCircle2 } from 'lucide-react';

export default function SalesTeamPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/employees');
        if (res.ok) {
          const json = await res.json();
          setEmployees(json.data || []);
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
          <Users2 className="w-6 h-6 text-purple-400" />
          Field Sales Representatives & Roster
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Territory sales representatives, assigned dealer coverage, daily shop visit targets and order booking metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Loading sales representatives...
          </div>
        ) : (
          employees.map((emp) => (
            <div
              key={emp.id}
              className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl overflow-hidden border border-purple-500/30 bg-[#10132A] flex items-center justify-center shrink-0 shadow-sm">
                      {emp.profilePhoto ? (
                        <img src={emp.profilePhoto} alt={emp.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-purple-300">{emp.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{emp.name}</h3>
                      <p className="text-[11px] text-purple-400 font-medium">{emp.designation || 'Field Representative'}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/20">
                    {emp.employeeCode}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{emp.phone || '+91 98450 12345'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{emp.branch || 'Bangalore Central Hub'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#23294E]/60 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Assigned Dealers</span>
                  <span className="font-bold text-white">{emp.distributionStats?.assignedRetailers || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Orders Booked</span>
                  <span className="font-bold text-emerald-400">{emp.distributionStats?.ordersBooked || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Deliveries</span>
                  <span className="font-bold text-purple-300">{emp.distributionStats?.deliveriesHandled || 0}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
