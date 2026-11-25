'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Plus,
  Search,
  Filter,
  Layers,
  Boxes,
  QrCode,
  Tag,
  DollarSign,
  Cpu,
  HardDrive,
  BatteryCharging,
  Eye,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ProductItem {
  _id: string;
  name: string;
  brand: string;
  modelName?: string;
  sku: string;
  category: string;
  hsnCode?: string;
  ram?: string;
  storage?: string;
  display?: string;
  battery?: string;
  mrp: number;
  dealerPrice: number;
  sellingPrice: number;
  taxRatePercent: number;
  requiresImei: boolean;
  onHandStock: number;
  availableStock: number;
}

export default function MobileElectronicsCatalogPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    brand: 'Samsung',
    modelName: '',
    sku: '',
    category: 'SMARTPHONES',
    ram: '8GB',
    storage: '256GB',
    display: '6.7" AMOLED 120Hz',
    battery: '5000 mAh',
    mrp: 34999,
    dealerPrice: 28000,
    sellingPrice: 31999,
    taxRatePercent: 18,
    hsnCode: '85171200',
    requiresImei: true,
  });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);

      const res = await fetch(`/api/electronics/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await fetch('/api/electronics/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Product "${data.product.name}" created with SKU ${data.product.sku}`,
        });
        setIsModalOpen(false);
        fetchProducts();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create product' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const smartphoneCount = products.filter((p) => p.category === 'SMARTPHONES').length;
  const accessoryCount = products.filter((p) => p.category === 'ACCESSORIES').length;
  const electronicsCount = products.filter((p) => p.category !== 'SMARTPHONES' && p.category !== 'ACCESSORIES').length;

  return (
    <div className="min-h-screen bg-[#F6F5FF] p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              ENTERPRISE CATALOG
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Live Pricing
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#11152F] tracking-tight">
            Mobile & Electronics Product Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive catalog with technical specifications (RAM, Storage, Battery), HSN tax codes (85171200 / 85044090), and individual IMEI tracking flags.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/field-sales/import"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#5428E8] shadow-sm hover:bg-indigo-50 transition"
          >
            <UploadCloud className="h-4 w-4" />
            Import Products CSV
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" />
            Add New Product
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</span>
            <Boxes className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-[#11152F] mt-2">{products.length}</p>
          <span className="text-[11px] text-slate-400">Total active catalog items</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Smartphones</span>
            <Smartphone className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">{smartphoneCount}</p>
          <span className="text-[11px] text-indigo-500">IMEI tracked 5G / 4G models</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Accessories</span>
            <Tag className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{accessoryCount}</p>
          <span className="text-[11px] text-emerald-600">Chargers, cables, audio, cases</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Electronics</span>
            <Layers className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{electronicsCount}</p>
          <span className="text-[11px] text-amber-500">Tablets, laptops, smart TVs</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, brand, model, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#5428E8] focus:outline-none focus:ring-1 focus:ring-[#5428E8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          {['ALL', 'SMARTPHONES', 'ACCESSORIES', 'TABLETS_ELECTRONICS'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-[#5428E8] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Products' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center text-slate-400 border border-indigo-100">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
          <p className="text-sm font-semibold">Loading product catalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl bg-white p-16 text-center border border-indigo-100 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5428E8] mb-4">
            <Smartphone className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-[#11152F]">No Products Found in Catalog</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            There are no products in the catalog matching your search. Add your first smartphone or import products in bulk.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5428E8] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" />
              Add First Product
            </button>
            <Link
              href="/field-sales/import"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <UploadCloud className="h-4 w-4" />
              Import Products CSV
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p._id}
              className="group rounded-3xl bg-white p-6 border border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between"
            >
              <div>
                {/* Brand & Category badges */}
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-[#5428E8] border border-indigo-100">
                    {p.brand}
                  </span>
                  {p.requiresImei ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 border border-emerald-200">
                      <QrCode className="h-3 w-3" /> IMEI Tracked
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                      Standard
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-[#11152F] text-base group-hover:text-[#5428E8] transition leading-snug">
                  {p.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                  <span>SKU: {p.sku}</span>
                  {p.hsnCode && <span>• HSN: {p.hsnCode}</span>}
                </div>

                {/* Smartphone Specs Chips */}
                {(p.ram || p.storage || p.battery || p.display) && (
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {p.ram && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                        <span>RAM: {p.ram}</span>
                      </div>
                    )}
                    {p.storage && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <HardDrive className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Storage: {p.storage}</span>
                      </div>
                    )}
                    {p.battery && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <BatteryCharging className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{p.battery}</span>
                      </div>
                    )}
                    {p.display && (
                      <div className="flex items-center gap-1.5 text-slate-600 truncate">
                        <span>{p.display}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing & Stock */}
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-end justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Selling Price</span>
                  <div className="text-xl font-black text-[#11152F]">
                    ₹{p.sellingPrice.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dealer: ₹{p.dealerPrice.toLocaleString('en-IN')} • GST {p.taxRatePercent}%
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Stock</span>
                  <span className="inline-block rounded-xl bg-indigo-50 px-3 py-1 font-mono text-xs font-bold text-indigo-700 border border-indigo-200">
                    {p.availableStock} in stock
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-indigo-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="h-6 w-6 text-[#5428E8]" />
                <h3 className="text-xl font-extrabold text-[#11152F]">Add Mobile Device or Accessory</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samsung Galaxy S24 Ultra 5G (Titanium Black, 256GB)"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Brand *
                  </label>
                  <select
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  >
                    <option value="Samsung">Samsung</option>
                    <option value="Apple">Apple</option>
                    <option value="Xiaomi">Xiaomi / Redmi / POCO</option>
                    <option value="OnePlus">OnePlus</option>
                    <option value="Realme">Realme</option>
                    <option value="Vivo">Vivo</option>
                    <option value="OPPO">OPPO</option>
                    <option value="Motorola">Motorola</option>
                    <option value="Anker">Anker</option>
                    <option value="boAt">boAt</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  >
                    <option value="SMARTPHONES">Smartphones & Feature Phones</option>
                    <option value="ACCESSORIES">Accessories & Audio</option>
                    <option value="TABLETS_ELECTRONICS">Tablets & Electronics</option>
                    <option value="WEARABLES">Wearables & Smartwatches</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SAM-S24U-256-BLK"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    HSN Tax Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="85171200 (Phones) or 85044090"
                    value={form.hsnCode}
                    onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                    className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">RAM</label>
                  <input
                    type="text"
                    placeholder="e.g. 12GB"
                    value={form.ram}
                    onChange={(e) => setForm({ ...form, ram: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Storage</label>
                  <input
                    type="text"
                    placeholder="e.g. 256GB"
                    value={form.storage}
                    onChange={(e) => setForm({ ...form, storage: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Battery</label>
                  <input
                    type="text"
                    placeholder="e.g. 5000 mAh"
                    value={form.battery}
                    onChange={(e) => setForm({ ...form, battery: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Display</label>
                  <input
                    type="text"
                    placeholder='e.g. 6.8" 120Hz'
                    value={form.display}
                    onChange={(e) => setForm({ ...form, display: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dealer Price (₹)
                  </label>
                  <input
                    type="number"
                    value={form.dealerPrice}
                    onChange={(e) => setForm({ ...form, dealerPrice: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="reqImei"
                  checked={form.requiresImei}
                  onChange={(e) => setForm({ ...form, requiresImei: e.target.checked })}
                  className="h-4 w-4 rounded text-[#5428E8] focus:ring-[#5428E8]"
                />
                <label htmlFor="reqImei" className="text-xs font-semibold text-slate-700">
                  Requires individual 15-digit IMEI / Serial Number tracking on delivery
                </label>
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
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-5 py-2 text-sm font-bold text-white shadow hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Product to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
