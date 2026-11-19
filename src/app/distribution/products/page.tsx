'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Edit2,
  Archive,
  RefreshCw,
  Boxes,
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [brand, setBrand] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // New Product Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Apple',
    modelName: '',
    sku: '',
    category: 'SMARTPHONES',
    mrp: '',
    dealerPrice: '',
    stockQuantity: '25',
    requiresImei: true,
    hsnCode: '85171200',
    color: 'Titanium Black',
    ram: '8GB',
    storage: '256GB',
    description: '',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/products', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (category !== 'ALL') url.searchParams.set('category', category);
      if (brand !== 'ALL') url.searchParams.set('brand', brand);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category, brand]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          mrp: Number(formData.mrp),
          dealerPrice: Number(formData.dealerPrice),
          stockQuantity: Number(formData.stockQuantity),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to create product');
      } else {
        setShowAddModal(false);
        // Reset form
        setFormData({
          name: '',
          brand: 'Apple',
          modelName: '',
          sku: '',
          category: 'SMARTPHONES',
          mrp: '',
          dealerPrice: '',
          stockQuantity: '25',
          requiresImei: true,
          hsnCode: '85171200',
          color: 'Titanium Black',
          ram: '8GB',
          storage: '256GB',
          description: '',
        });
        fetchProducts();
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error occurred');
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
            <Smartphone className="w-6 h-6 text-purple-400" />
            Hardware & Product Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage electronic hardware specifications, dealer wholesale tiers, and warehouse SKU allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#151A38] border border-[#23294E] flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by product name, SKU or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#10132A] border border-[#23294E] focus:border-purple-500 text-xs text-white placeholder-slate-400 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#1E2552] hover:bg-[#28326D] text-xs font-semibold text-white transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="SMARTPHONES">Smartphones</option>
            <option value="TABLETS">Tablets</option>
            <option value="SMARTWATCHES">Smartwatches</option>
            <option value="EARBUDS">Earbuds</option>
            <option value="HEADPHONES">Headphones</option>
            <option value="CHARGERS">Chargers</option>
            <option value="POWERBANKS">Power Banks</option>
            <option value="ACCESSORIES">Accessories</option>
          </select>

          {/* Brand Filter */}
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Brands</option>
            <option value="Apple">Apple</option>
            <option value="Samsung">Samsung</option>
            <option value="OnePlus">OnePlus</option>
            <option value="Xiaomi">Xiaomi</option>
            <option value="Realme">Realme</option>
            <option value="Motorola">Motorola</option>
            <option value="Anker">Anker</option>
            <option value="boAt">boAt</option>
            <option value="Sony">Sony</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-[#23294E] bg-[#111533]">
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category & Brand</th>
                <th className="py-3 px-4">HSN & Specs</th>
                <th className="py-3 px-4">Public MRP</th>
                <th className="py-3 px-4">Dealer Wholesale</th>
                <th className="py-3 px-4">Stock Level</th>
                <th className="py-3 px-4">IMEI Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23294E]/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                    Loading hardware products from MongoDB...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No hardware products match the current filter.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id} className="hover:bg-[#1A2045] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.photograph || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=120'}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-black/40 border border-white/10 shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-white text-xs">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-200">{p.brand}</span>
                      <div className="text-[10px] text-purple-400 font-semibold">{p.category}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>HSN: {p.hsnCode || '85171200'}</div>
                      <div className="text-[10px] text-slate-400">
                        {p.storage ? `${p.storage} • ` : ''}
                        {p.color || ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{formatCurrency(p.mrp)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-emerald-400">{formatCurrency(p.dealerPrice)}</div>
                      <div className="text-[10px] text-slate-400">
                        Margin: {Math.round(((p.mrp - p.dealerPrice) / p.mrp) * 100)}%
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.stockStatus === 'IN_STOCK'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : p.stockStatus === 'LOW_STOCK'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        }`}
                      >
                        {p.stockQuantity} Units
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.requiresImei ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                          Dual IMEI
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Standard Barcode</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#151A38] border border-[#2B3363] shadow-2xl p-6 ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-4 border-b border-[#23294E]">
              <div>
                <h2 className="text-base font-bold text-white">Add New Hardware Product</h2>
                <p className="text-xs text-slate-400">Register product into MongoDB catalog and initialize central warehouse stock.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="my-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. iPhone 16 Pro Max 256GB"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Brand *</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white outline-none focus:border-purple-500"
                  >
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="OnePlus">OnePlus</option>
                    <option value="Xiaomi">Xiaomi</option>
                    <option value="Realme">Realme</option>
                    <option value="Motorola">Motorola</option>
                    <option value="Anker">Anker</option>
                    <option value="boAt">boAt</option>
                    <option value="Sony">Sony</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. iPhone 16 Pro Max"
                    value={formData.modelName}
                    onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Unique SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APL-IP16PM-256-BLK"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white outline-none focus:border-purple-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white outline-none focus:border-purple-500"
                  >
                    <option value="SMARTPHONES">Smartphones</option>
                    <option value="TABLETS">Tablets</option>
                    <option value="SMARTWATCHES">Smartwatches</option>
                    <option value="EARBUDS">Wireless Earbuds</option>
                    <option value="HEADPHONES">Headphones</option>
                    <option value="CHARGERS">Chargers</option>
                    <option value="POWERBANKS">Power Banks</option>
                    <option value="ACCESSORIES">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Public MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="144900"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Dealer Wholesale Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="131900"
                    value={formData.dealerPrice}
                    onChange={(e) => setFormData({ ...formData, dealerPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white outline-none focus:border-purple-500 font-mono text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Stock Units</label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="reqImei"
                    checked={formData.requiresImei}
                    onChange={(e) => setFormData({ ...formData, requiresImei: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 bg-[#10132A] border-[#23294E]"
                  />
                  <label htmlFor="reqImei" className="text-slate-300 font-medium cursor-pointer">
                    Requires Dual IMEI Scanning on Dispatch
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#23294E] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#10132A] hover:bg-[#1A2045] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Save Product to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
