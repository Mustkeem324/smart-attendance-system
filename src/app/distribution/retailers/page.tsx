'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  AlertCircle,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function RetailersPage() {
  const [retailers, setRetailers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Bangalore',
    area: 'SP Road',
    pincode: '560002',
    shopCategory: 'MOBILE_RETAIL',
    gstin: '',
    creditLimit: '200000',
    paymentTerms: 'Net 15 Days',
  });

  const fetchRetailers = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/retailers', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setRetailers(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, [statusFilter]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/retailers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creditLimit: Number(formData.creditLimit),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to register retailer');
      } else {
        setShowAddModal(false);
        setFormData({
          name: '',
          ownerName: '',
          phone: '',
          email: '',
          address: '',
          city: 'Bangalore',
          area: 'SP Road',
          pincode: '560002',
          shopCategory: 'MOBILE_RETAIL',
          gstin: '',
          creditLimit: '200000',
          paymentTerms: 'Net 15 Days',
        });
        fetchRetailers();
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-purple-400" />
            Retailer & Dealer CRM
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Authorized electronics showroom partners, credit limit governance, KYC documents and ledger balance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Dealer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by store name, owner, phone or dealer code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRetailers()}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#10132A] border border-[#23294E] focus:border-purple-500 text-xs text-white placeholder-slate-400 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Dealers</option>
            <option value="SUSPENDED">Suspended Credit</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Retailers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Loading retailer directory...
          </div>
        ) : retailers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            No retailers registered in the platform matching the filter.
          </div>
        ) : (
          retailers.map((r) => {
            const utilizationPct = r.creditLimit > 0 ? Math.min(100, Math.round((r.outstandingBalance / r.creditLimit) * 100)) : 0;

            return (
              <div
                key={r._id}
                className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/40 transition-all shadow-xl flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                        {r.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">Owner: {r.ownerName}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Store className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="font-mono text-purple-300 font-semibold">{r.dealerCode}</span>
                      <span>•</span>
                      <span>{r.shopCategory?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{r.area}, {r.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{r.phone}</span>
                    </div>
                  </div>

                  {/* Credit Utilization Bar */}
                  <div className="mt-4 pt-3 border-t border-[#23294E]/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Outstanding Balance:</span>
                      <span className="font-bold text-amber-300 font-mono">{formatCurrency(r.outstandingBalance)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Limit: {formatCurrency(r.creditLimit)}</span>
                      <span>{utilizationPct}% Utilized</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#10132A] overflow-hidden">
                      <div
                        style={{ width: `${utilizationPct}%` }}
                        className={`h-full rounded-full ${
                          utilizationPct > 80 ? 'bg-rose-500' : utilizationPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#23294E]/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">
                    GSTIN: {r.gstin || 'Unregistered'}
                  </span>
                  <Link
                    href={`/distribution/orders`}
                    className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <span>Create Order</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Onboard Retailer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80  animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-400" />
                Register New Authorized Retailer
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleRegister} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Store / Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metro Mobile Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9845012345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Dealer GSTIN</label>
                  <input
                    type="text"
                    placeholder="29AABCS1234F1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono uppercase"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Shop Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Shop #12, Ground Floor, SP Road Commercial Complex"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Area *</label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono text-emerald-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#23294E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#10132A] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Retailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
