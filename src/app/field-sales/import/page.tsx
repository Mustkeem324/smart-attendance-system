'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Smartphone,
  Store,
  Layers,
  ArrowRight,
  Database,
  FileText,
  RotateCcw,
} from 'lucide-react';

type ImportTab = 'retailers' | 'products' | 'imei';

const SAMPLE_RETAILERS = [
  {
    shopName: 'Shree Sai Mobile & Electronics',
    ownerName: 'Sunil Deshmukh',
    phone: '9822019944',
    gstin: '27AABCU9603R1ZM',
    dealerCode: 'DLR-MUM-01',
    address: 'Shop 4, Phoenix Marketcity, Kurla West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400070',
    category: 'MOBILE_RETAIL',
    creditLimit: 500000,
    paymentTerms: 'NET_15',
    latitude: 19.086,
    longitude: 72.889,
  },
  {
    shopName: 'National Telecom & Smart Gadgets',
    ownerName: 'Amit Singhania',
    phone: '9833124567',
    gstin: '27AAECN7821Q1ZK',
    dealerCode: 'DLR-PUN-02',
    address: '102 FC Road, Deccan Gymkhana',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411004',
    category: 'MULTI_BRAND_STORE',
    creditLimit: 750000,
    paymentTerms: 'NET_30',
    latitude: 18.5204,
    longitude: 73.8567,
  },
];

const SAMPLE_PRODUCTS = [
  {
    name: 'Samsung Galaxy S24 Ultra 5G (Titanium Gray, 256GB)',
    brand: 'Samsung',
    modelNumber: 'SM-S928B',
    sku: 'SAM-S24U-256-GRY',
    categoryName: 'SMARTPHONES',
    ram: '12GB',
    storage: '256GB',
    display: '6.8" Dynamic AMOLED 2X 120Hz',
    battery: '5000 mAh',
    mrp: 129999,
    dealerPrice: 112000,
    sellingPrice: 119999,
    taxRatePercent: 18,
    hsnCode: '85171200',
    requiresImei: true,
  },
  {
    name: 'Redmi Note 13 Pro+ 5G (Fusion Purple, 256GB)',
    brand: 'Redmi',
    modelNumber: '23090RA98I',
    sku: 'RDM-N13P-256-PUR',
    categoryName: 'SMARTPHONES',
    ram: '8GB',
    storage: '256GB',
    display: '6.67" Curved 1.5K AMOLED 120Hz',
    battery: '5000 mAh',
    mrp: 31999,
    dealerPrice: 26500,
    sellingPrice: 28999,
    taxRatePercent: 18,
    hsnCode: '85171200',
    requiresImei: true,
  },
  {
    name: 'Anker PowerPort 65W GaN Fast Charger',
    brand: 'Anker',
    modelNumber: 'A2663',
    sku: 'ANK-65W-GAN-BLK',
    categoryName: 'ACCESSORIES',
    ram: '',
    storage: '',
    display: '',
    battery: '',
    mrp: 3999,
    dealerPrice: 2400,
    sellingPrice: 2999,
    taxRatePercent: 18,
    hsnCode: '85044090',
    requiresImei: false,
  },
];

const SAMPLE_IMEIS = [
  {
    sku: 'SAM-S24U-256-GRY',
    imei1: '354891110023451',
    imei2: '354891110023452',
    serialNumber: 'R5CW10098ABC',
    batchNumber: 'LOT-2026-SAM01',
    warrantyMonths: 12,
    condition: 'BRAND_NEW',
  },
  {
    sku: 'SAM-S24U-256-GRY',
    imei1: '354891110023453',
    imei2: '354891110023454',
    serialNumber: 'R5CW10098ABD',
    batchNumber: 'LOT-2026-SAM01',
    warrantyMonths: 12,
    condition: 'BRAND_NEW',
  },
  {
    sku: 'RDM-N13P-256-PUR',
    imei1: '869201061129481',
    imei2: '869201061129482',
    serialNumber: 'SN-XIA-99014',
    batchNumber: 'LOT-2026-RDM01',
    warrantyMonths: 12,
    condition: 'BRAND_NEW',
  },
];

export default function RealDataImportCenter() {
  const [activeTab, setActiveTab] = useState<ImportTab>('retailers');
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(SAMPLE_RETAILERS, null, 2));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (tab: ImportTab) => {
    setActiveTab(tab);
    setResult(null);
    setError(null);
    if (tab === 'retailers') {
      setJsonText(JSON.stringify(SAMPLE_RETAILERS, null, 2));
    } else if (tab === 'products') {
      setJsonText(JSON.stringify(SAMPLE_PRODUCTS, null, 2));
    } else {
      setJsonText(JSON.stringify(SAMPLE_IMEIS, null, 2));
    }
  };

  const handleExecuteImport = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setResult(null);

      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch (err: any) {
        throw new Error('Invalid JSON format: ' + err.message);
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Payload must be a non-empty array of records');
      }

      const payload: any = { type: activeTab };
      if (activeTab === 'retailers') payload.retailers = parsed;
      else if (activeTab === 'products') payload.products = parsed;
      else payload.deviceSerials = parsed;

      const res = await fetch('/api/electronics/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data);
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              DATA ONBOARDING ENGINE
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              MongoDB Native
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Real Data Import Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Import real enterprise company data: Retailers & Dealers, Mobile/Electronics Catalog, and Bulk 15-digit IMEI Serials with duplicate prevention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/field-sales"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            Go to Sales Dashboard
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-indigo-100 pb-3">
        <button
          onClick={() => handleTabChange('retailers')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'retailers'
              ? 'bg-[#5428E8] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200'
          }`}
        >
          <Store className="h-4 w-4" />
          1. Retailers & Dealers
        </button>

        <button
          onClick={() => handleTabChange('products')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'products'
              ? 'bg-[#5428E8] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          2. Product Catalog (Smartphones/Specs)
        </button>

        <button
          onClick={() => handleTabChange('imei')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'imei'
              ? 'bg-[#5428E8] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200'
          }`}
        >
          <QrCode className="h-4 w-4" />
          3. Inward Bulk IMEI / Serials
        </button>
      </div>

      {/* Result / Error Banner */}
      {result && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-emerald-900 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <h4 className="font-extrabold text-base text-emerald-900">
                Import Successfully Completed!
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Processed real records and synced with MongoDB 7.0 database.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs font-semibold">
            <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
              <span className="text-slate-400 block">Total Imported</span>
              <span className="text-lg font-black text-emerald-800">
                {(result.result?.importedCount ?? result.result?.imported) || 0}
              </span>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
              <span className="text-slate-400 block">Duplicates Skipped</span>
              <span className="text-lg font-black text-amber-700">
                {(result.result?.skippedCount ?? result.result?.skipped) || 0}
              </span>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
              <span className="text-slate-400 block">Errors Encounted</span>
              <span className="text-lg font-black text-slate-700">
                {result.result?.errors?.length || 0}
              </span>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 flex items-center justify-center">
              <Link
                href={
                  activeTab === 'retailers'
                    ? '/field-sales/shops'
                    : activeTab === 'products'
                    ? '/field-sales/products'
                    : '/field-sales/imei'
                }
                className="text-xs font-bold text-indigo-700 hover:underline inline-flex items-center gap-1"
              >
                View in Directory <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Editor & Instructions Box */}
      <div className="rounded-2xl bg-white p-6 border border-indigo-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#11152F]">
              {activeTab === 'retailers'
                ? 'Dealer & Retailer Records (JSON / CSV schema)'
                : activeTab === 'products'
                ? 'Smartphone & Electronics Catalog (RAM, Storage, HSN, Tax)'
                : 'Bulk 15-Digit IMEI & Serial Inwarding'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste your company records or customize the production schema below.
            </p>
          </div>
          <button
            onClick={() => handleTabChange(activeTab)}
            className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Sample Template
          </button>
        </div>

        <textarea
          rows={14}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="w-full font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-[#5428E8] focus:outline-none transition leading-relaxed"
          spellCheck={false}
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Database className="h-4 w-4 text-indigo-500" />
            <span>Direct write to MongoDB 7.0 (`smart_electronics_db`)</span>
          </div>

          <button
            onClick={handleExecuteImport}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition disabled:opacity-50"
          >
            <UploadCloud className="h-4 w-4" />
            {submitting ? 'Validating & Importing...' : 'Validate & Import into Database'}
          </button>
        </div>
      </div>
    </div>
  );
}
