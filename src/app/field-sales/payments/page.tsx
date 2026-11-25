'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';

interface PaymentItem {
  _id: string;
  receiptNumber: string;
  retailerId: {
    _id: string;
    shopName: string;
    dealerCode: string;
    phone?: string;
  };
  invoiceId?: {
    _id: string;
    invoiceNumber: string;
  };
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  paymentProofUrl?: string;
  notes?: string;
  createdAt: string;
}

export default function PaymentCollectionPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    retailerId: '',
    amount: 50000,
    paymentMethod: 'UPI',
    transactionReference: '',
    notes: 'Payment collected and credited to dealer ledger',
  });

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (methodFilter !== 'ALL') params.set('paymentMethod', methodFilter);

      const res = await fetch(`/api/electronics/payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [methodFilter]);

  const fetchRetailers = useCallback(async () => {
    try {
      const res = await fetch('/api/electronics/retailers');
      if (res.ok) {
        const d = await res.json();
        setRetailers(d.retailers || []);
        if (d.retailers?.length > 0) {
          setForm((prev) => (prev.retailerId ? prev : { ...prev, retailerId: d.retailers[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchRetailers();
  }, [fetchRetailers]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.retailerId) {
      setFeedback({ type: 'error', message: 'Please select a retailer' });
      return;
    }
    if (form.amount <= 0) {
      setFeedback({ type: 'error', message: 'Amount must be greater than zero' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await fetch('/api/electronics/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Payment of ₹${form.amount.toLocaleString('en-IN')} recorded with Receipt ${data.payment.receiptNumber}. Ledger credited!`,
        });
        setIsModalOpen(false);
        fetchPayments();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to record payment' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.receiptNumber?.toLowerCase().includes(s) ||
      p.retailerId?.shopName?.toLowerCase().includes(s) ||
      p.retailerId?.dealerCode?.toLowerCase().includes(s) ||
      p.transactionReference?.toLowerCase().includes(s)
    );
  });

  const totalCollected = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              REVENUE RECOVERY
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Auto Ledger Credit
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Payment Collections & Receipts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Record UPI, NEFT, RTGS, Cheque, and cash collections from mobile retailers with automatic ledger credit reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/field-sales/ledger"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#5428E8] shadow-sm hover:bg-indigo-50 transition"
          >
            <CreditCard className="h-4 w-4" />
            View Dealer Ledgers
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" />
            Record Payment
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Receipts</span>
            <Receipt className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-[#11152F] mt-2">{filteredPayments.length}</p>
          <span className="text-[11px] text-slate-400">Total payments collected</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Collected</span>
            <span className="text-sm font-bold text-emerald-600">INR</span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            ₹{totalCollected.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-emerald-600">Reconciled dealer inflows</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">UPI / Digital</span>
            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">
            {payments.filter((p) => p.paymentMethod === 'UPI' || p.paymentMethod === 'NEFT' || p.paymentMethod === 'RTGS').length}
          </p>
          <span className="text-[11px] text-indigo-500">Instant digital transfers</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Cheques / Cash</span>
            <DollarSign className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">
            {payments.filter((p) => p.paymentMethod === 'CHEQUE' || p.paymentMethod === 'CASH').length}
          </p>
          <span className="text-[11px] text-amber-500">Physical instruments</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Receipt #, Dealer, or Reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#5428E8] focus:outline-none focus:ring-1 focus:ring-[#5428E8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          {['ALL', 'UPI', 'NEFT', 'RTGS', 'CHEQUE', 'CASH'].map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                methodFilter === m
                  ? 'bg-[#5428E8] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold">Loading payment receipts...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
              <Receipt className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#11152F]">No Payment Records Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              No payments matching your query. Record collections from dealers to credit their financial accounts.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" />
              Record First Payment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#11152F] text-xs font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Receipt #</th>
                  <th className="px-6 py-4">Dealer / Account</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Reference #</th>
                  <th className="px-6 py-4 text-right">Amount Credited</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-indigo-50/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-700">
                      {p.receiptNumber}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.retailerId?.shopName || 'Retailer'}</div>
                      <div className="text-xs text-slate-400">{p.retailerId?.dealerCode}</div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        {p.paymentMethod}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {p.transactionReference || <span className="text-slate-400 italic">None</span>}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-sm font-extrabold text-emerald-600">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/field-sales/ledger?retailerId=${p.retailerId?._id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                      >
                        Ledger <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-indigo-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="h-6 w-6 text-[#5428E8]" />
                <h3 className="text-xl font-extrabold text-[#11152F]">Record Payment Collection</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Retailer / Dealer Account *
                </label>
                <select
                  value={form.retailerId}
                  onChange={(e) => setForm({ ...form, retailerId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  required
                >
                  {retailers.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name || r.shopName} ({r.dealerCode}) - Due: ₹{(r.outstandingBalance || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Collection Amount (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="NEFT">NEFT Bank Transfer</option>
                    <option value="RTGS">RTGS High-Value Transfer</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="CASH">Cash Collection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    UTR / Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-99014294821"
                    value={form.transactionReference}
                    onChange={(e) => setForm({ ...form, transactionReference: e.target.value })}
                    className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                />
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
                  disabled={submitting || retailers.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-6 py-2.5 text-sm font-bold text-white shadow hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Payment & Credit Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
