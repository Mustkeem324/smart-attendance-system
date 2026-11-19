'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  FileCheck,
  UserCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  Plus,
} from 'lucide-react';

interface LedgerEntry {
  _id: string;
  retailerId: {
    _id: string;
    shopName: string;
    dealerCode: string;
    ownerName?: string;
    phone?: string;
    currentBalance: number;
    creditLimit: number;
    gstin?: string;
  };
  transactionType: 'INVOICE_DEBIT' | 'PAYMENT_CREDIT' | 'RETURN_CREDIT' | 'OPENING_BALANCE';
  referenceId: string;
  date: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  description: string;
}

export default function DealerLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('');
  const [retailerDetails, setRetailerDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchRetailers = useCallback(async () => {
    try {
      const res = await fetch('/api/electronics/retailers');
      if (res.ok) {
        const data = await res.json();
        setRetailers(data.retailers || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedRetailerId) params.set('retailerId', selectedRetailerId);
      if (typeFilter !== 'ALL') params.set('transactionType', typeFilter);

      const res = await fetch(`/api/electronics/ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        if (data.retailerDetails) {
          setRetailerDetails(data.retailerDetails);
        } else if (!selectedRetailerId) {
          setRetailerDetails(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedRetailerId, typeFilter]);

  useEffect(() => {
    fetchRetailers();
  }, [fetchRetailers]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Aggregate metrics
  const totalDebits = entries.reduce((sum, e) => sum + (e.debitAmount || 0), 0);
  const totalCredits = entries.reduce((sum, e) => sum + (e.creditAmount || 0), 0);

  // Credit calculation if specific retailer selected
  const creditLimit = retailerDetails?.creditLimit || 0;
  const currentBalance = retailerDetails?.currentBalance || 0;
  const availableCredit = Math.max(0, creditLimit - currentBalance);
  const creditUtilPercent = creditLimit > 0 ? Math.min(100, Math.round((currentBalance / creditLimit) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              FINANCIAL ACCOUNTING
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Live Dealer Ledgers
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Dealer Credit & Ledger Statements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Double-entry ledger of invoice debits, payment credits, and real-time dealer credit line utilization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/field-sales/payments"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
          >
            <Receipt className="h-4 w-4" />
            Record Payment Collection
          </Link>
        </div>
      </div>

      {/* Dealer Selection & Summary Card */}
      <div className="rounded-2xl bg-white p-6 border border-indigo-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="w-full md:w-96">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Dealer Account
            </label>
            <select
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:border-[#5428E8] focus:outline-none"
            >
              <option value="">-- All Dealer Accounts (Consolidated) --</option>
              {retailers.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.shopName} ({r.dealerCode}) - {r.ownerName || 'Proprietor'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type:</span>
            {['ALL', 'INVOICE_DEBIT', 'PAYMENT_CREDIT', 'RETURN_CREDIT'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  typeFilter === t
                    ? 'bg-[#5428E8] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'ALL' ? 'All' : t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Dealer Credit Line Profile */}
        {retailerDetails && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <span className="text-xs font-semibold text-slate-500 block">Dealer Credit Limit</span>
              <p className="text-2xl font-black text-[#11152F] mt-1">
                ₹{creditLimit.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-indigo-600">Approved Credit Ceiling</span>
            </div>

            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
              <span className="text-xs font-semibold text-rose-600 block">Outstanding Receivable</span>
              <p className="text-2xl font-black text-rose-700 mt-1">
                ₹{currentBalance.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-rose-500">Unpaid Billed Invoices</span>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-600 block">Available Credit</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                ₹{availableCredit.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-emerald-600">Headroom for new orders</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Credit Utilization</span>
                <span>{creditUtilPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    creditUtilPercent > 85 ? 'bg-rose-500' : creditUtilPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${creditUtilPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">GSTIN: {retailerDetails.gstin || 'Unregistered'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold">Loading financial ledger entries from MongoDB...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
              <CreditCard className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#11152F]">No Ledger Transactions Recorded</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Debit entries are automatically created when invoices are generated, and credit entries are added when payments are collected.
            </p>
            <Link
              href="/field-sales/payments"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
            >
              <Receipt className="h-4 w-4" />
              Collect Dealer Payment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#11152F] text-xs font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Transaction Date</th>
                  <th className="px-6 py-4">Dealer / Account</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Reference Voucher</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Debit (+)</th>
                  <th className="px-6 py-4 text-right">Credit (-)</th>
                  <th className="px-6 py-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const isDebit = entry.transactionType === 'INVOICE_DEBIT';
                  return (
                    <tr key={entry._id} className="hover:bg-indigo-50/40 transition">
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{entry.retailerId?.shopName || 'Retailer'}</div>
                        <div className="text-xs text-slate-400">{entry.retailerId?.dealerCode}</div>
                      </td>

                      <td className="px-6 py-4">
                        {isDebit ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-extrabold text-rose-700 border border-rose-200">
                            <ArrowUpRight className="h-3 w-3" /> DEBIT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft className="h-3 w-3" /> CREDIT
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-indigo-700 text-xs">
                        {entry.referenceId}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                        {entry.description}
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-xs font-bold text-rose-600">
                        {entry.debitAmount > 0 ? `₹${entry.debitAmount.toLocaleString('en-IN')}` : '-'}
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-xs font-bold text-emerald-600">
                        {entry.creditAmount > 0 ? `₹${entry.creditAmount.toLocaleString('en-IN')}` : '-'}
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-sm font-extrabold text-slate-900">
                        ₹{(entry.balance || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
