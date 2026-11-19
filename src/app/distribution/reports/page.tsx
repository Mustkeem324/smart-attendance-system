'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Boxes,
  DollarSign,
  Receipt,
  RefreshCw,
} from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/reports?type=${reportType}`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Business Intelligence & Reports Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Turnover audits, warehouse inventory valuations, credit receivables aging, and GSTR-1 B2B returns.
          </p>
        </div>

        <a
          href={`/api/v1/reports?type=${reportType}&export=csv`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Download Active Report (CSV)</span>
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#23294E] pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setReportType('sales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors ${
            reportType === 'sales'
              ? 'bg-[#713BFF] text-white'
              : 'text-slate-400 hover:text-white hover:bg-[#151A38]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Sales & Turnover</span>
        </button>
        <button
          onClick={() => setReportType('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors ${
            reportType === 'inventory'
              ? 'bg-[#713BFF] text-white'
              : 'text-slate-400 hover:text-white hover:bg-[#151A38]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Inventory Valuation</span>
        </button>
        <button
          onClick={() => setReportType('receivables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors ${
            reportType === 'receivables'
              ? 'bg-[#713BFF] text-white'
              : 'text-slate-400 hover:text-white hover:bg-[#151A38]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Dealer Receivables</span>
        </button>
        <button
          onClick={() => setReportType('gst')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors ${
            reportType === 'gst'
              ? 'bg-[#713BFF] text-white'
              : 'text-slate-400 hover:text-white hover:bg-[#151A38]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>GST Rule 46 (GSTR-1)</span>
        </button>
      </div>

      {/* Summary Banner */}
      {reportData?.summary && (
        <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Report Summary Metrics</span>
            <div className="flex items-center gap-6 mt-1 text-sm font-bold text-white">
              {Object.keys(reportData.summary).map((k) => (
                <div key={k}>
                  <span className="text-[11px] text-slate-400 font-normal block capitalize">
                    {k.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-emerald-400 font-mono">
                    {typeof reportData.summary[k] === 'number' && reportData.summary[k] > 500
                      ? formatCurrency(reportData.summary[k])
                      : reportData.summary[k]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <a
            href={`/api/v1/reports?type=${reportType}&export=csv`}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10132A] hover:bg-[#1E2552] border border-white/5 text-xs text-slate-300 font-medium"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Excel / CSV</span>
          </a>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
              Calculating aggregations...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533] sticky top-0">
                {reportType === 'sales' && (
                  <tr>
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Retailer</th>
                    <th className="py-3 px-4">Units</th>
                    <th className="py-3 px-4">Taxable</th>
                    <th className="py-3 px-4">Total Value</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                )}
                {reportType === 'inventory' && (
                  <tr>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Available</th>
                    <th className="py-3 px-4">Dealer Price</th>
                    <th className="py-3 px-4">Valuation</th>
                  </tr>
                )}
                {reportType === 'receivables' && (
                  <tr>
                    <th className="py-3 px-4">Dealer Code</th>
                    <th className="py-3 px-4">Retailer</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Credit Limit</th>
                    <th className="py-3 px-4">Outstanding</th>
                  </tr>
                )}
                {reportType === 'gst' && (
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Retailer</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">Taxable</th>
                    <th className="py-3 px-4">Total Value</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
                {(reportData?.records || []).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-[#1A2045]">
                    {reportType === 'sales' && (
                      <>
                        <td className="py-2.5 px-4 font-mono font-bold text-white">{row.orderNumber}</td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {new Date(row.orderDate || row.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4">{row.retailerId?.name}</td>
                        <td className="py-2.5 px-4 font-bold">{row.totalUnits}</td>
                        <td className="py-2.5 px-4 font-mono">{formatCurrency(row.taxableValue)}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">
                          {formatCurrency(row.finalOrderValue)}
                        </td>
                        <td className="py-2.5 px-4">{row.status}</td>
                      </>
                    )}
                    {reportType === 'inventory' && (
                      <>
                        <td className="py-2.5 px-4">{row.warehouseId?.name}</td>
                        <td className="py-2.5 px-4 font-semibold text-white">{row.productId?.name}</td>
                        <td className="py-2.5 px-4 font-mono text-purple-300">{row.productId?.sku}</td>
                        <td className="py-2.5 px-4 font-bold text-white">{row.availableStock}</td>
                        <td className="py-2.5 px-4 font-mono">{formatCurrency(row.productId?.dealerPrice)}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">
                          {formatCurrency((row.availableStock || 0) * (row.productId?.dealerPrice || 0))}
                        </td>
                      </>
                    )}
                    {reportType === 'receivables' && (
                      <>
                        <td className="py-2.5 px-4 font-mono text-purple-300 font-bold">{row.dealerCode}</td>
                        <td className="py-2.5 px-4 font-semibold text-white">{row.name}</td>
                        <td className="py-2.5 px-4 text-slate-400">{row.phone}</td>
                        <td className="py-2.5 px-4">{row.city}</td>
                        <td className="py-2.5 px-4 font-mono">{formatCurrency(row.creditLimit)}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-300">
                          {formatCurrency(row.outstandingBalance)}
                        </td>
                      </>
                    )}
                    {reportType === 'gst' && (
                      <>
                        <td className="py-2.5 px-4 font-mono font-bold text-white">{row.invoiceNumber}</td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {new Date(row.invoiceDate || row.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4">{row.retailerDetails?.shopName}</td>
                        <td className="py-2.5 px-4 font-mono text-purple-300">
                          {row.retailerDetails?.gstin || 'None'}
                        </td>
                        <td className="py-2.5 px-4 font-mono">{formatCurrency(row.taxableAmount)}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">
                          {formatCurrency(row.totalInvoiceValue)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
