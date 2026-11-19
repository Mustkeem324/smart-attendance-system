'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  Search,
  Filter,
  MapPin,
  Phone,
  User,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
} from 'lucide-react';

interface RetailerItem {
  _id: string;
  name: string;
  ownerName: string;
  phone: string;
  altPhone?: string;
  dealerCode: string;
  gstin?: string;
  shopCategory: string;
  address: string;
  city: string;
  state: string;
  area: string;
  pincode: string;
  latitude: number;
  longitude: number;
  creditLimit: number;
  outstandingBalance: number;
  paymentTerms: string;
  status: string;
  createdAt: string;
}

export default function RetailerDirectoryPage() {
  const [retailers, setRetailers] = useState<RetailerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    gstin: '',
    dealerCode: '',
    shopCategory: 'MOBILE_RETAIL',
    address: '',
    area: 'Connaught Place',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    latitude: 28.6315,
    longitude: 77.2167,
    creditLimit: 500000,
    paymentTerms: 'Net 15 Days',
  });

  const fetchRetailers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);

      const res = await fetch(`/api/electronics/retailers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRetailers(data.retailers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchRetailers();
  }, [fetchRetailers]);

  const handleCreateRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await fetch('/api/electronics/retailers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Dealer "${data.retailer.name}" registered successfully with Code ${data.retailer.dealerCode}`,
        });
        setIsModalOpen(false);
        fetchRetailers();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to register retailer' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalCreditOffered = retailers.reduce((sum, r) => sum + (r.creditLimit || 0), 0);
  const totalOutstanding = retailers.reduce((sum, r) => sum + (r.outstandingBalance || 0), 0);

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              RETAILER DISTRIBUTION NETWORK
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              MongoDB 7.0 Verified
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Retailer & Dealer Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage authorized mobile shops, multi-brand electronics showrooms, GSTIN numbers, GPS geofencing, and credit limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/field-sales/import"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#5428E8] shadow-sm hover:bg-indigo-50 transition"
          >
            <UploadCloud className="h-4 w-4" />
            Import Dealers CSV
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" />
            Register New Dealer
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 text-sm font-medium border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Retailers</span>
            <Store className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-[#11152F] mt-2">{retailers.length}</p>
          <span className="text-[11px] text-slate-400">Authorized dealer accounts</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Credit Extended</span>
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            ₹{totalCreditOffered.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-emerald-600">Total authorized credit limit</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Outstanding</span>
            <DollarSign className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-amber-500">Unsettled dealer balance</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Active Status</span>
            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">
            {retailers.filter((r) => r.status === 'ACTIVE').length}
          </p>
          <span className="text-[11px] text-indigo-500">Verified & ordering enabled</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shop name, owner, phone, dealer code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#5428E8] focus:outline-none focus:ring-1 focus:ring-[#5428E8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          {['ALL', 'MOBILE_RETAIL', 'MULTI_BRAND_STORE', 'ELECTRONICS_SHOWROOM', 'DISTRIBUTOR'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-[#5428E8] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Dealers' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Retailers Directory Table */}
      <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold">Loading retailers from MongoDB...</p>
          </div>
        ) : retailers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
              <Store className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#11152F]">No Retailers Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              There are no dealer accounts matching your query in the database. Register your first authorized dealer or import via CSV.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
              >
                <Plus className="h-4 w-4" />
                Register First Dealer
              </button>
              <Link
                href="/field-sales/import"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <UploadCloud className="h-4 w-4" />
                Import Dealers CSV
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#11152F] text-xs font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Shop & Dealer Code</th>
                  <th className="px-6 py-4">Owner & Contact</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">GSTIN</th>
                  <th className="px-6 py-4 text-right">Credit Limit</th>
                  <th className="px-6 py-4 text-right">Outstanding</th>
                  <th className="px-6 py-4 text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retailers.map((r) => (
                  <tr key={r._id} className="hover:bg-indigo-50/40 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{r.name}</div>
                      <div className="font-mono text-xs font-semibold text-indigo-700 mt-0.5">
                        {r.dealerCode}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-medium">{r.ownerName}</div>
                      <div className="text-xs text-slate-400">{r.phone}</div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-[#5428E8] border border-indigo-100 whitespace-nowrap">
                        {r.shopCategory.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div>{r.area}, {r.city}</div>
                      <div className="text-slate-400">{r.state} - {r.pincode}</div>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {r.gstin || <span className="text-slate-400 italic">Unregistered</span>}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-xs font-semibold text-slate-900">
                      ₹{(r.creditLimit || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-xs font-bold text-rose-600">
                      ₹{(r.outstandingBalance || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/field-sales/ledger?retailerId=${r._id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 transition"
                      >
                        <FileText className="h-3 w-3" />
                        Ledger
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Dealer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-indigo-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="h-6 w-6 text-[#5428E8]" />
                <h3 className="text-xl font-extrabold text-[#11152F]">Register New Retailer / Dealer</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRetailer} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Mobile World"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Owner / Proprietor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9811223344"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    GSTIN (15 Alphanumeric)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                    className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dealer Category *
                  </label>
                  <select
                    value={form.shopCategory}
                    onChange={(e) => setForm({ ...form, shopCategory: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  >
                    <option value="MOBILE_RETAIL">Mobile Retail Store</option>
                    <option value="MULTI_BRAND_STORE">Multi-Brand Store</option>
                    <option value="ELECTRONICS_SHOWROOM">Electronics Showroom</option>
                    <option value="ACCESSORIES_SHOP">Accessories Shop</option>
                    <option value="DISTRIBUTOR">Sub-Distributor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={form.creditLimit}
                    onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shop 12, Ground Floor, Central Mall"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Area / Locality *</label>
                  <input
                    type="text"
                    required
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2 text-sm font-bold text-white shadow hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
