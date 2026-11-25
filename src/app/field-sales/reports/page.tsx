'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  FileText,
  Printer,
  CheckCircle2,
  TrendingUp,
  Store,
  Truck,
  Receipt,
  Boxes,
} from 'lucide-react';

export default function FieldSalesReportsPage() {
  const [reportType, setReportType] = useState('deliveries_register');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const reportList = [
    {
      id: 'deliveries_register',
      name: 'Comprehensive Delivery Register',
      desc: 'Complete log of deliveries, product line items, taxation, discounts, and net sales values.',
      icon: Truck,
      format: 'Multi-Sheet Excel (.xlsx)',
    },
    {
      id: 'shop_visits',
      name: 'Daily Shop Visit & GPS Radar Report',
      desc: 'Sales representative check-in logs with Haversine distance, accuracy, and geofence verification.',
      icon: Store,
      format: 'Excel / CSV',
    },
    {
      id: 'product_performance',
      name: 'Product-Wise Delivery & Velocity Report',
      desc: 'Quantities delivered, sales turnover generated, and category breakdown across all retail shops.',
      icon: Boxes,
      format: 'Excel / CSV',
    },
    {
      id: 'payment_collections',
      name: 'Payment Collections & Outstanding Balance',
      desc: 'Recorded cash, UPI, cheques, and credit sales balances per retailer store.',
      icon: Receipt,
      format: 'Excel / CSV',
    },
  ];

  const handleExport = (format: 'excel' | 'csv') => {
    const q = new URLSearchParams({
      startDate,
      endDate,
      reportType,
      format,
    });
    window.open(`/api/sales/reports/export?${q.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Field Sales &amp; Delivery Reports
            </h1>
            <span className="rounded-full bg-[#6538ED]/10 px-2.5 py-0.5 text-xs font-bold text-[#6538ED]">
              Distribution Export Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Download enterprise multi-sheet Excel spreadsheets, audit logs, and delivery challans
          </p>
        </div>
      </div>

      {/* Date Range Selector Card */}
      <div className="rounded-3xl border border-[#E6E8F2] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#5428E8]" />
            <span>From Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 focus:border-[#5428E8] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span>To Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 focus:border-[#5428E8] focus:outline-none"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 rounded-2xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#5428E8]/20 hover:bg-[#431fbd] transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Excel Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reportList.map((r) => {
          const Icon = r.icon;
          const isSelected = reportType === r.id;
          return (
            <div
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`cursor-pointer rounded-3xl border p-5 transition ${
                isSelected
                  ? 'border-[#5428E8] bg-white shadow-md shadow-[#5428E8]/10 ring-2 ring-[#5428E8]/20'
                  : 'border-[#E6E8F2] bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      isSelected ? 'bg-[#5428E8] text-white' : 'bg-[#5428E8]/10 text-[#5428E8]'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{r.name}</h3>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {r.format}
                    </span>
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="h-5 w-5 text-[#5428E8]" />}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{r.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
