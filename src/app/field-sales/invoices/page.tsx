'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck,
  Search,
  Filter,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';

interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  retailerId: {
    _id: string;
    shopName: string;
    dealerCode: string;
    ownerName?: string;
    phone?: string;
    gstin?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  orderId?: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  isPaid: boolean;
  status: string;
}

export default function TaxInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paidFilter, setPaidFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (paidFilter === 'PAID') params.set('isPaid', 'true');
      if (paidFilter === 'UNPAID') params.set('isPaid', 'false');

      const res = await fetch(`/api/electronics/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [paidFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(s) ||
      inv.retailerId?.shopName?.toLowerCase().includes(s) ||
      inv.retailerId?.dealerCode?.toLowerCase().includes(s) ||
      inv.retailerId?.gstin?.toLowerCase().includes(s)
    );
  });

  // Metrics
  const totalBilled = filteredInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const totalGst = filteredInvoices.reduce((sum, i) => sum + (i.cgstAmount || 0) + (i.sgstAmount || 0), 0);
  const totalPaid = filteredInvoices.filter((i) => i.isPaid).length;
  const totalUnpaid = filteredInvoices.filter((i) => !i.isPaid).length;

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              GST BILLING & INVOICING
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Auto-Generated Tax Invoices
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Tax Invoices & Billing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compliant Indian GST Tax Invoices (INV-YYYYMM-XXXX) with HSN codes, dual CGST & SGST breakdown, and automated dealer ledger sync.
          </p>
        </div>

        <Link
          href="/field-sales/orders"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
        >
          <FileText className="h-4 w-4" />
          View Approved Orders
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</span>
            <FileCheck className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-[#11152F] mt-2">{filteredInvoices.length}</p>
          <span className="text-[11px] text-slate-400">Total tax invoices issued</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Billed</span>
            <span className="text-sm font-bold text-emerald-600">INR</span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            ₹{totalBilled.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-emerald-600">Total gross billed amount</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Total GST Tax</span>
            <span className="text-sm font-bold text-indigo-600">18%</span>
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">
            ₹{totalGst.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-indigo-500">CGST (9%) + SGST (9%)</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Outstanding Invoices</span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{totalUnpaid}</p>
          <span className="text-[11px] text-amber-500">{totalPaid} marked fully paid</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, dealer name, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#5428E8] focus:outline-none focus:ring-1 focus:ring-[#5428E8]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          {(['ALL', 'UNPAID', 'PAID'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setPaidFilter(filter)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                paidFilter === filter
                  ? 'bg-[#5428E8] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'ALL' ? 'All Invoices' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold">Loading tax invoices from MongoDB...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
              <FileCheck className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#11152F]">No Tax Invoices Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Tax invoices are automatically created when sales orders are approved. Approve your first order to generate a GST compliant invoice.
            </p>
            <Link
              href="/field-sales/orders"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
            >
              <FileText className="h-4 w-4" />
              Go to Sales Orders
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#11152F] text-xs font-bold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Dealer / Retailer</th>
                  <th className="px-6 py-4">GSTIN</th>
                  <th className="px-6 py-4">Tax (CGST + SGST)</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Payment Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-indigo-50/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-700">
                      {inv.invoiceNumber}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{inv.retailerId?.shopName || 'Unknown Dealer'}</div>
                      <div className="text-xs text-slate-400">{inv.retailerId?.dealerCode}</div>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {inv.retailerId?.gstin || (
                        <span className="text-slate-400 italic">Unregistered</span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-800">
                      ₹{((inv.cgstAmount || 0) + (inv.sgstAmount || 0)).toLocaleString('en-IN')}
                      <div className="text-[10px] text-slate-400">9% + 9%</div>
                    </td>

                    <td className="px-6 py-4 font-extrabold text-slate-900">
                      ₹{(inv.totalAmount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-6 py-4">
                      {inv.isPaid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" /> Unpaid
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View GST Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tax Invoice Modal Preview */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-indigo-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-[#5428E8]" />
                <div>
                  <h3 className="text-xl font-black text-[#11152F]">TAX INVOICE</h3>
                  <span className="text-xs text-slate-400">Rule 46 - Central Goods & Services Tax Rules, 2017</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Tax Invoice Content */}
            <div className="my-6 border border-slate-200 rounded-2xl p-6 bg-white space-y-6">
              {/* Header Company & Invoice Meta */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-black text-[#11152F] tracking-tight">
                    SMARTATTENDANCE ELECTRONICS PVT. LTD.
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Authorized Smartphone & Electronics Master Distributor</p>
                  <p className="text-xs text-slate-500">GSTIN: <span className="font-mono font-bold text-slate-700">27AABCS1429B1Z2</span></p>
                  <p className="text-xs text-slate-500">State: Maharashtra (Code: 27)</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-extrabold text-sm px-3 py-1 rounded-lg">
                    {selectedInvoice.invoiceNumber}
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    BILLED TO (BUYER / DEALER)
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">{selectedInvoice.retailerId?.shopName}</p>
                  <p className="text-slate-600">Owner: {selectedInvoice.retailerId?.ownerName || 'Proprietor'}</p>
                  <p className="text-slate-600">Phone: {selectedInvoice.retailerId?.phone || 'N/A'}</p>
                  <p className="text-slate-600">Address: {selectedInvoice.retailerId?.address || 'Shop Address'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    DEALER & TAX DETAILS
                  </span>
                  <p className="text-slate-700">Dealer Code: <span className="font-bold">{selectedInvoice.retailerId?.dealerCode}</span></p>
                  <p className="text-slate-700">
                    Buyer GSTIN: <span className="font-mono font-bold text-slate-900">{selectedInvoice.retailerId?.gstin || 'UNREGISTERED'}</span>
                  </p>
                  <p className="text-slate-700">Place of Supply: State Intra-State (27)</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#11152F] text-white uppercase text-[11px] font-bold">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3">HSN Code</th>
                      <th className="p-3 text-right">Taxable Val</th>
                      <th className="p-3 text-right">CGST (9%)</th>
                      <th className="p-3 text-right">SGST (9%)</th>
                      <th className="p-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-bold text-slate-800">
                        Smartphones & Accessories Order Consignment
                        <div className="text-[11px] font-normal text-slate-400">
                          Ref Order: {selectedInvoice.orderId || 'Direct Invoice'}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">85171200</td>
                      <td className="p-3 text-right font-mono font-semibold">
                        ₹{(selectedInvoice.subtotal || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        ₹{(selectedInvoice.cgstAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        ₹{(selectedInvoice.sgstAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ₹{(selectedInvoice.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calculations summary */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono">₹{(selectedInvoice.subtotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST @ 9%:</span>
                    <span className="font-mono">₹{(selectedInvoice.cgstAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST @ 9%:</span>
                    <span className="font-mono">₹{(selectedInvoice.sgstAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-indigo-700 pt-2 border-t">
                    <span>Invoice Total:</span>
                    <span className="font-mono">₹{(selectedInvoice.totalAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Footer signature */}
              <div className="pt-6 border-t border-slate-100 flex justify-between items-end text-xs text-slate-400">
                <div>
                  <p>Declaration: Certified that all particulars are true and correct.</p>
                  <p className="mt-1">Computer-generated GST compliant invoice.</p>
                </div>
                <div className="text-right">
                  <div className="h-10 w-36 border-b border-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 mt-1">Authorized Signatory</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-5 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
              >
                <Printer className="h-4 w-4" />
                Print Tax Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
