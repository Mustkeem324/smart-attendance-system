'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Building,
} from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/invoices', window.location.origin);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

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
            <Receipt className="w-6 h-6 text-purple-400" />
            GST Tax Invoices & Billing Console
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Indian GST Rule 46 compliant B2B tax invoices, line-item HSN breakdown, CGST/SGST/IGST tax splits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/v1/reports?type=gst&export=csv"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E2552] hover:bg-[#28326D] text-white text-xs font-semibold border border-purple-500/30 transition-all"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Export GSTR-1 CSV</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] flex items-center justify-between shadow-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by invoice number or store name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchInvoices()}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#10132A] border border-[#23294E] focus:border-purple-500 text-xs text-white placeholder-slate-400 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Invoice Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Retailer & GSTIN</th>
                <th className="py-3 px-4">Taxable Value</th>
                <th className="py-3 px-4">GST Split</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Loading invoices from database...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No tax invoices currently recorded.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const gst = (inv.cgstTotal || 0) + (inv.sgstTotal || 0) + (inv.igstTotal || 0);
                  const ret = inv.retailerDetails || {};

                  return (
                    <tr key={inv._id} className="hover:bg-[#1A2045] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{ret.shopName}</div>
                        <div className="text-[10px] text-purple-400 font-mono">GSTIN: {ret.gstin || 'None'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{formatCurrency(inv.taxableAmount)}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {formatCurrency(gst)}
                        <span className="text-[10px] text-slate-500 block">
                          {inv.igstTotal > 0 ? 'IGST 18%' : 'CGST 9% + SGST 9%'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {formatCurrency(inv.totalInvoiceValue)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.isPaid
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {inv.isPaid ? 'PAID' : `UNPAID (${formatCurrency(inv.outstandingBalance)})`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 rounded-lg bg-[#1E2552] hover:bg-[#28326D] text-purple-300 hover:text-white font-semibold text-[11px] flex items-center gap-1.5 ml-auto transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Tax Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formal Tax Invoice Preview Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-2xl p-8 ring-1 ring-black/20">
            {/* Modal Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded">
                Official GST Tax Invoice Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Printable Sheet */}
            <div className="space-y-6 text-xs text-slate-800">
              {/* Header Details */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {selectedInvoice.sellerDetails?.companyName || 'Salman Enterprises Distribution Ltd.'}
                  </h2>
                  <p className="text-slate-600 mt-1 max-w-sm">
                    {selectedInvoice.sellerDetails?.address}
                  </p>
                  <p className="font-mono mt-1 text-slate-700 font-medium">
                    GSTIN: {selectedInvoice.sellerDetails?.gstin} • State: Karnataka (29)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black font-mono text-purple-700">
                    {selectedInvoice.invoiceNumber}
                  </div>
                  <p className="text-slate-600">
                    Invoice Date: {new Date(selectedInvoice.invoiceDate || selectedInvoice.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-slate-600">Terms: {selectedInvoice.paymentTerms || 'Net 15 Days'}</p>
                </div>
              </div>

              {/* Billed To Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Billed To (Authorized Dealer):</div>
                <div className="font-bold text-sm text-slate-900">{selectedInvoice.retailerDetails?.shopName}</div>
                <p className="text-slate-600">{selectedInvoice.retailerDetails?.address}</p>
                <p className="font-mono font-medium text-slate-700 mt-1">
                  GSTIN: {selectedInvoice.retailerDetails?.gstin || 'Unregistered Dealer'}
                </p>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-700">
                    <th className="p-2 border border-slate-200">Item Description</th>
                    <th className="p-2 border border-slate-200">HSN</th>
                    <th className="p-2 border border-slate-200 text-center">Qty</th>
                    <th className="p-2 border border-slate-200 text-right">Unit Price</th>
                    <th className="p-2 border border-slate-200 text-right">Taxable</th>
                    <th className="p-2 border border-slate-200 text-right">GST</th>
                    <th className="p-2 border border-slate-200 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(selectedInvoice.items || []).map((it: any, idx: number) => {
                    const gst = (it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2 border border-slate-200 font-medium">{it.productName}</td>
                        <td className="p-2 border border-slate-200 font-mono text-[10px]">{it.hsnCode}</td>
                        <td className="p-2 border border-slate-200 text-center font-bold">{it.quantity}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono">{formatCurrency(it.taxableAmount)}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono">{formatCurrency(gst)}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono font-bold">
                          {formatCurrency(it.totalAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono">{formatCurrency(selectedInvoice.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9%):</span>
                    <span className="font-mono">{formatCurrency(selectedInvoice.cgstTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9%):</span>
                    <span className="font-mono">{formatCurrency(selectedInvoice.sgstTotal || 0)}</span>
                  </div>
                  {selectedInvoice.igstTotal > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST (18%):</span>
                      <span className="font-mono">{formatCurrency(selectedInvoice.igstTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-300">
                    <span>Total Invoice Value:</span>
                    <span className="font-mono text-purple-700">
                      {formatCurrency(selectedInvoice.totalInvoiceValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature block */}
              <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-[11px] text-slate-500">
                <div>
                  <p className="font-semibold text-slate-700">Banking Details for RTGS / NEFT:</p>
                  <p>Bank: HDFC Bank Ltd. • A/c: 50200088991122</p>
                  <p>IFSC: HDFC0001234 • Branch: Electronic City Corporate</p>
                </div>
                <div className="text-right">
                  <div className="h-10 border-b border-slate-400 w-44 ml-auto mb-1" />
                  <p className="font-semibold text-slate-700">For Salman Enterprises Distribution Ltd.</p>
                  <p>Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
