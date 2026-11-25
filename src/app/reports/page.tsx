'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Users,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Table,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Bulk Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/departments'), fetch('/api/branches')]).then(async ([dRes, bRes]) => {
      if (dRes.ok) {
        const d = await dRes.json();
        setDepartments(d.departments || []);
      }
      if (bRes.ok) {
        const b = await bRes.json();
        setBranches(b.branches || []);
      }
    });
  }, []);

  const handlePreviewUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImportLoading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/admin/employees/import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setPreviewResult(data);
        setFeedback(`Preview ready: ${data.validCount} valid rows, ${data.invalidCount} invalid rows.`);
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Upload error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult?.validRows?.length) return;

    setImportLoading(true);
    try {
      const res = await fetch('/api/admin/employees/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validRows: previewResult.validRows }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback(`Successfully imported ${data.importedCount} employees with default user accounts and leave balances!`);
        setPreviewResult(null);
        setImportFile(null);
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Import error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const buildExportUrl = (format: string) => {
    const params = new URLSearchParams();
    if (selectedMonth) params.append('month', selectedMonth);
    if (selectedDepartment) params.append('departmentId', selectedDepartment);
    if (selectedBranch) params.append('branchId', selectedBranch);
    params.append('format', format);
    return `/api/reports/export?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Enterprise Reporting & Bulk Data Operations
            </h1>
            <span className="rounded-full bg-[#6538ED]/10 px-2.5 py-0.5 text-xs font-bold text-[#6538ED]">
              Enterprise Reporting Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            01–31 Daily Attendance Grid, Executive Multi-sheet workbooks, and bulk employee onboarding
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'export'
                ? 'bg-[#5428E8] text-white shadow-md shadow-[#5428E8]/25'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Reports</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'import'
                ? 'bg-[#5428E8] text-white shadow-md shadow-[#5428E8]/25'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Bulk Import</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl border border-indigo-100 bg-[#F6F5FF] p-4 text-xs font-semibold text-[#5428E8]">
          {feedback}
        </div>
      )}

      {/* TAB 1: EXPORT REPORTS */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Export Filters</span>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Month Period</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Branch Location</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cards for Export Formats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* 01-31 Grid Excel */}
            <div className="rounded-3xl border border-indigo-100 bg-[#F6F5FF] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5428E8] text-white shadow-md shadow-[#5428E8]/30">
                  <Table className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">
                  01–31 Daily Attendance Grid
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Multi-sheet Excel with Executive Summary, 01-31 Daily Grid (P, A, L, H, WO, HD, WFH color-coded), and Leave Ledger balances.
                </p>
              </div>

              <div className="mt-6">
                <a
                  href={buildExportUrl('grid')}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5428E8] py-2.5 text-xs font-bold text-white shadow-md shadow-[#5428E8]/25 hover:bg-[#431fbd] transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Multi-Sheet Grid</span>
                </a>
              </div>
            </div>

            {/* Standard Detailed Excel */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">
                  Attendance Records (.xlsx)
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Detailed line-by-line attendance records with geofence verification status, check-in, check-out, and total hours.
                </p>
              </div>

              <div className="mt-6">
                <a
                  href={buildExportUrl('xlsx')}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Download XLSX</span>
                </a>
              </div>
            </div>

            {/* Standard CSV */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">
                  Raw Attendance Data (.csv)
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Comma-separated raw data feed suitable for custom data pipelines, analytics warehouses, and ERP integrations.
                </p>
              </div>

              <div className="mt-6">
                <a
                  href={buildExportUrl('csv')}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Download CSV</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BULK IMPORT */}
      {activeTab === 'import' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Bulk Employee Onboarding</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload an Excel (.xlsx) file to validate employee codes, emails, shifts, departments, and initialize accounts.
            </p>
          </div>

          <form onSubmit={handlePreviewUpload} className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-xs font-bold text-slate-700">Select employee roster file</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="mt-3 text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <a
                href="/api/reports/template"
                className="text-xs font-bold text-[#5428E8] hover:underline"
              >
                Download Standard Import Template
              </a>

              <button
                type="submit"
                disabled={!importFile || importLoading}
                className="rounded-2xl bg-[#5428E8] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#5428E8]/25 hover:bg-[#431fbd] disabled:opacity-50 transition"
              >
                {importLoading ? 'Validating...' : 'Validate & Preview Import'}
              </button>
            </div>
          </form>

          {/* Validation Results Preview */}
          {previewResult && (
            <div className="rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900">Validation Breakdown</h4>
                  <p className="text-xs text-slate-500">
                    {previewResult.validCount} valid employees ready for insert • {previewResult.invalidCount} validation errors
                  </p>
                </div>

                {previewResult.validCount > 0 && (
                  <button
                    onClick={handleConfirmImport}
                    disabled={importLoading}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 transition"
                  >
                    Confirm & Onboard {previewResult.validCount} Employees
                  </button>
                )}
              </div>

              {previewResult.invalidRows?.length > 0 && (
                <div className="rounded-xl bg-red-50 p-3 space-y-1">
                  <p className="text-xs font-bold text-red-800">Errors to Resolve:</p>
                  {previewResult.invalidRows.map((inv: any, i: number) => (
                    <p key={i} className="text-[11px] text-red-600">
                      Row {inv.rowNumber}: {inv.errors.join(', ')}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
