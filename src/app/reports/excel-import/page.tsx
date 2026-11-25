'use client';

import React, { useState } from 'react';
import { useUi } from '@/components/providers/UiProvider';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  AlertCircle,
} from 'lucide-react';

export default function ExcelImportPage() {
  const { toast } = useUi();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    importedCount: number;
    errors: { row: number; error: string }[];
    message: string;
  } | null>(null);

  const handleDownloadTemplate = () => {
    window.open('/api/reports/template', '_blank');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/reports/import-employees', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success(`Imported ${data.importedCount ?? 0} employee record(s).`);
      } else {
        toast.error(data.error || 'Failed to upload and import Excel');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Bulk Employee Excel Import
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Upload multi-row Excel spreadsheets to import or update workforce directories with automatic department, branch, and shift validation.
        </p>
      </div>

      {/* Grid: Download Template & Upload Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Step 1: Download Template */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
            <Download className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
            1. Download Official Template
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Download the pre-formatted Excel template with required columns: Employee Code, Names, Email, Department Code, Branch Code, and Shift Code.
          </p>

          <button
            onClick={handleDownloadTemplate}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            <span>Download Template (.xlsx)</span>
          </button>
        </div>

        {/* Step 2: Upload Excel File */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <UploadCloud className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
            2. Upload Completed Spreadsheet
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Select or drag your .xlsx file to validate and register employee login accounts and leave balances.
          </p>

          <form onSubmit={handleUpload} className="mt-6 space-y-4">
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <FileSpreadsheet className="h-10 w-10 text-brand-500" />
              <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                {file ? file.name : 'Click to select or drag .xlsx file here'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Supported format: Microsoft Excel OpenXML (.xlsx)
              </p>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="mt-3 text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50"
            >
              {uploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Execute Excel Import</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Import Diagnostics & Error Summary */}
      {result && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Import Execution Results
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="text-xs font-semibold">Employees Registered</span>
              <p className="mt-1 text-2xl font-extrabold">{result.importedCount}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="text-xs font-semibold">Validation Warnings</span>
              <p className="mt-1 text-2xl font-extrabold">{result.errors.length}</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Row-Level Validation Error Details:
              </h3>
              <div className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40 dark:divide-slate-800">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-center justify-between py-2 text-rose-700 dark:text-rose-400">
                    <span className="font-bold">Row {err.row}:</span>
                    <span>{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
