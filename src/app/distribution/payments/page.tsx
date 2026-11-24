'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  DollarSign,
  X,
  RefreshCw,
  Receipt,
  Building,
} from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Payment Form State
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('50000');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('Wholesale invoice settlement');

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/payments', window.location.origin);
      if (methodFilter !== 'ALL') url.searchParams.set('paymentMethod', methodFilter);

      const [payRes, retRes, invRes] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/v1/retailers'),
        fetch('/api/v1/invoices?isPaid=false'),
      ]);

      if (payRes.ok) {
        const json = await payRes.json();
        setPayments(json.data || []);
      }
      if (retRes.ok) {
        const retJson = await retRes.json();
        setRetailers(retJson.data || []);
        if (retJson.data?.length > 0 && !selectedRetailerId) {
          setSelectedRetailerId(retJson.data[0]._id);
        }
      }
      if (invRes.ok) {
        const invJson = await invRes.json();
        setInvoices(invJson.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [methodFilter]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: selectedRetailerId,
          invoiceId: selectedInvoiceId || undefined,
          amount: Number(amount),
          paymentMethod,
          transactionReference: transactionReference || `TXN-${Date.now().toString().slice(-6)}`,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error || 'Failed to record payment');
      } else {
        setShowAddModal(false);
        setTransactionReference('');
        fetchData();
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error occurred');
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
            <CreditCard className="w-6 h-6 text-purple-400" />
            Payment Collections & Cash Realization
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Record UPI, NEFT, RTGS and Cash realizations with double-entry dealer ledger posting and receipt generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment Collection</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Payment Channels</option>
            <option value="UPI">UPI Realizations</option>
            <option value="NEFT">NEFT / RTGS Bank Transfer</option>
            <option value="CASH">Cash Deposit</option>
            <option value="CHEQUE">Cheque Clearing</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Receipt Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Retailer & Dealer Code</th>
                <th className="py-3 px-4">Channel & Method</th>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Allocated Invoice</th>
                <th className="py-3 px-4">Realized Amount</th>
                <th className="py-3 px-4">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Loading payment collections...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payment collections recorded.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const ret = p.retailerId || {};
                  const inv = p.invoiceId || {};

                  return (
                    <tr key={p._id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{p.receiptNumber}</td>
                      <td className="py-3 px-4 text-slate-400">{p.collectionDate || new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{ret.name || 'Retail Partner'}</div>
                        <div className="text-[10px] text-purple-400 font-mono">{ret.dealerCode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold text-[10px]">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {p.transactionReference || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {inv.invoiceNumber ? (
                          <span className="text-purple-300">{inv.invoiceNumber}</span>
                        ) : (
                          <span className="text-slate-400">Open Credit Balance</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Reconciled
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80  animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-[#23294E]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Record Payment Collection
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Retailer Partner *</label>
                <select
                  value={selectedRetailerId}
                  onChange={(e) => setSelectedRetailerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  {retailers.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.dealerCode}) — Balance: {formatCurrency(r.outstandingBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Allocate Against Invoice (Optional)</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  <option value="">General Account Ledger Credit (No Invoice)</option>
                  {invoices
                    .filter((inv) => !selectedRetailerId || inv.retailerId?._id === selectedRetailerId || inv.retailerId === selectedRetailerId)
                    .map((inv) => (
                      <option key={inv._id} value={inv._id}>
                        {inv.invoiceNumber} — Outstanding: {formatCurrency(inv.outstandingBalance)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono text-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="NEFT">NEFT / RTGS Corporate Bank Transfer</option>
                  <option value="IMPS">IMPS Instant Transfer</option>
                  <option value="CASH">Cash In-Hand Handover</option>
                  <option value="CHEQUE">Banker Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">UTR / Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-432109876543"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
                />
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Posting Ledger Credit...' : 'Record & Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
