'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Building,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

export default function RetailerApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/retailer-applications', window.location.origin);
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setApplications(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/v1/retailer-applications/${id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchApplications();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/v1/retailer-applications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Inquiry criteria verification rejected by sales team' }),
      });
      if (res.ok) {
        fetchApplications();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-purple-400" />
            Retailer Inquiries & Onboarding Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review B2B dealer partnership applications, verify GSTIN, and activate live dealer accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#151A38] border border-[#23294E] text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Application Statuses</option>
            <option value="NEW">New Inquiries</option>
            <option value="APPROVED">Approved Dealers</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Loading retailer inquiries...
          </div>
        ) : applications.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            No retailer applications currently in the queue.
          </div>
        ) : (
          applications.map((app) => (
            <div
              key={app._id}
              className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{app.businessName}</h3>
                    <p className="text-[11px] text-slate-400">Proprietor: {app.ownerName}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      app.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : app.status === 'NEW'
                        ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{app.city}, {app.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{app.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">{app.email}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 font-mono">
                    GSTIN: {app.gstin || 'Pending Submission'}
                  </div>
                </div>

                {app.message && (
                  <div className="mt-3 p-2.5 rounded-xl bg-[#10132A] text-[11px] text-slate-300 border border-white/5">
                    &quot;{app.message}&quot;
                  </div>
                )}
              </div>

              {app.status === 'NEW' && (
                <div className="mt-4 pt-3 border-t border-[#23294E] flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleReject(app._id)}
                    disabled={processingId === app._id}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(app._id)}
                    disabled={processingId === app._id}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all disabled:opacity-50"
                  >
                    {processingId === app._id ? 'Activating...' : 'Approve & Activate'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
