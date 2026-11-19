'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Eye, X, Clock, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/audit-logs')
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const action = l.action.toLowerCase();
    const entity = l.entity.toLowerCase();
    const userEmail = (l.user?.email || '').toLowerCase();
    return action.includes(search.toLowerCase()) || entity.includes(search.toLowerCase()) || userEmail.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Security & Administrative Audit Trail
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Immutable log of employee creations, manual punch corrections, leave decisions, and administrative changes.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter audit logs by action, user email, or entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs outline-none"
        />
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">Triggered By</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {log.entity}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {log.user?.email || 'System Automated'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-slate-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        title="Inspect change payload"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Payload Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Audit Record Inspector ({selectedLog.action})
              </h2>
              <button onClick={() => setSelectedLog(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">Metadata:</span>
                <p className="mt-1 text-[11px] text-slate-500">
                  Entity: {selectedLog.entity} • User: {selectedLog.user?.email || 'System'} • Date: {new Date(selectedLog.createdAt).toLocaleString()}
                </p>
              </div>

              {selectedLog.oldValues && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Previous Values:</span>
                  <pre className="mt-1 overflow-x-auto rounded-xl bg-slate-100 p-3 text-[11px] font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">New Values / Payload:</span>
                  <pre className="mt-1 overflow-x-auto rounded-xl bg-slate-100 p-3 text-[11px] font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
