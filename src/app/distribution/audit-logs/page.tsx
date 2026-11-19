'use client';

import React, { useState, useEffect } from 'react';
import { History, RefreshCw, Shield, Filter, Search } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/audit-logs', window.location.origin);
      if (actionFilter !== 'ALL') url.searchParams.set('action', actionFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-purple-400" />
            Security & Operations Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable system logs of stock movements, sales transactions, delivery confirmations and financial modifications.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Operation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#1A2045] transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{log.entityType}</td>
                    <td className="py-3 px-4 text-slate-300">{log.userId}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
