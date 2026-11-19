'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Grid3X3,
  List,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Star,
  ShieldCheck,
  Truck,
  ArrowRight,
  Eye,
  RefreshCw,
  Smartphone,
  Tablet,
  Watch,
  Headphones,
  Zap,
  BatteryCharging,
  Boxes,
  Volume2,
  Laptop,
  Tv,
  LayoutGrid,
  Lock,
  Sparkles,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowUpDown,
  Tag,
  Info,
  AlertCircle,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Menu,
} from 'lucide-react';

interface ProductItem {
  _id: string;
  name: string;
  brand: string;
  modelName: string;
  modelNumber?: string;
  sku: string;
  barcode?: string;
  category: string;
  description?: string;
  photograph?: string;
  galleryImages?: string[];
  color?: string;
  availableColors?: string[];
  ram?: string;
  storage?: string;
  processor?: string;
  screenSize?: string;
  displaySpecs?: string;
  batterySpecs?: string;
  connectivity?: string;
  warrantyPeriodMonths?: number;
  mrp: number;
  retailSellingPrice?: number;
  dealerPrice?: number | null;
  isDealerAuthorized?: boolean;
  gstRatePercent?: number;
  hsnCode?: string;
  requiresImei?: boolean;
  stockQuantity?: number;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  featured?: boolean;
  rating?: number;
  reviewCount?: number;
}

interface CategoryCount {
  id: string;
  title: string;
  count: number;
  iconName?: string;
}

interface BrandCount {
  name: string;
  count: number;
}

// Icon mapping helper
const CATEGORY_ICONS: Record<string, any> = {
  ALL: LayoutGrid,
  SMARTPHONES: Smartphone,
  TABLETS: Tablet,
  SMARTWATCHES: Watch,
  EARBUDS: Headphones,
  HEADPHONES: Headphones,
  CHARGERS: Zap,
  POWERBANKS: BatteryCharging,
  ACCESSORIES: Boxes,
  SPEAKERS: Volume2,
  LAPTOPS: Laptop,
  ELECTRONICS: Tv,
};

export default function ProductCatalogPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Catalog State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDealerAuthorized, setIsDealerAuthorized] = useState<boolean>(false);

  // Categories and Brands from MongoDB
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [brands, setBrands] = useState<BrandCount[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000]);
  const [selectedRAMs, setSelectedRAMs] = useState<string[]>([]);
  const [selectedStorages, setSelectedStorages] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string>('');
  const [selectedWarranty, setSelectedWarranty] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // UI Interactive States
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [comparedProducts, setComparedProducts] = useState<ProductItem[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState<boolean>(false);
  const [quoteTargetProduct, setQuoteTargetProduct] = useState<ProductItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Quote Request Form State
  const [quoteForm, setQuoteForm] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    quantity: 10,
    preferredDeliveryLocation: 'Bangalore Central DC',
    city: 'Bangalore',
    state: 'Karnataka',
    additionalMessage: '',
  });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteFeedback, setQuoteFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    quoteNumber?: string;
  } | null>(null);

  // 1. Fetch Categories and Brands
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/api/public/catalog/categories-brands');
        if (res.ok) {
          const data = await res.json();
          if (data.categories) setCategories(data.categories);
          if (data.brands) setBrands(data.brands);
          if (data.priceRange) {
            setPriceRange([data.priceRange.min, data.priceRange.max]);
          }
        }
      } catch (err) {
        console.error('Failed to load categories/brands', err);
      }
    }
    loadMeta();
  }, []);

  // 2. Fetch Products with active filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedCategory && selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (selectedBrands.length > 0) params.set('brand', selectedBrands.join(','));
      if (priceRange[0] > 0) params.set('minPrice', String(priceRange[0]));
      if (priceRange[1] < 200000) params.set('maxPrice', String(priceRange[1]));
      if (selectedRAMs.length > 0) params.set('ram', selectedRAMs.join(','));
      if (selectedStorages.length > 0) params.set('storage', selectedStorages.join(','));
      if (selectedAvailability) params.set('availability', selectedAvailability);
      if (selectedWarranty !== null) params.set('warranty', String(selectedWarranty));
      params.set('sort', sortBy);
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetch(`/api/public/catalog?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalProducts(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setIsDealerAuthorized(Boolean(data.isDealerAuthorized));
      }
    } catch (err) {
      console.error('Failed to fetch catalog products', err);
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    selectedCategory,
    selectedBrands,
    priceRange,
    selectedRAMs,
    selectedStorages,
    selectedAvailability,
    selectedWarranty,
    sortBy,
    page,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Brand Toggle Helper
  const toggleBrand = (brandName: string) => {
    setPage(1);
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
  };

  // RAM Toggle Helper
  const toggleRAM = (ramVal: string) => {
    setPage(1);
    setSelectedRAMs((prev) =>
      prev.includes(ramVal) ? prev.filter((r) => r !== ramVal) : [...prev, ramVal]
    );
  };

  // Storage Toggle Helper
  const toggleStorage = (storageVal: string) => {
    setPage(1);
    setSelectedStorages((prev) =>
      prev.includes(storageVal) ? prev.filter((s) => s !== storageVal) : [...prev, storageVal]
    );
  };

  // Clear All Filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedBrands([]);
    setPriceRange([0, 200000]);
    setSelectedRAMs([]);
    setSelectedStorages([]);
    setSelectedAvailability('');
    setSelectedWarranty(null);
    setSortBy('featured');
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'ALL') count++;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (selectedRAMs.length > 0) count += selectedRAMs.length;
    if (selectedStorages.length > 0) count += selectedStorages.length;
    if (selectedAvailability) count++;
    if (selectedWarranty !== null) count++;
    if (priceRange[0] > 0 || priceRange[1] < 200000) count++;
    return count;
  }, [
    searchQuery,
    selectedCategory,
    selectedBrands,
    selectedRAMs,
    selectedStorages,
    selectedAvailability,
    selectedWarranty,
    priceRange,
  ]);

  // Comparison Handlers (up to 4 products)
  const toggleCompare = (product: ProductItem) => {
    setComparedProducts((prev) => {
      const exists = prev.find((p) => p._id === product._id);
      if (exists) {
        return prev.filter((p) => p._id !== product._id);
      }
      if (prev.length >= 4) {
        alert('You can compare a maximum of 4 products simultaneously.');
        return prev;
      }
      return [...prev, product];
    });
  };

  // Open Quote Modal with targeted product
  const openQuoteModalFor = (product?: ProductItem) => {
    setQuoteTargetProduct(product || products[0] || null);
    setQuoteFeedback(null);
    setQuoteModalOpen(true);
  };

  // Handle Quote Submission
  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteTargetProduct) return;
    setQuoteSubmitting(true);
    setQuoteFeedback(null);

    try {
      const payload = {
        businessName: quoteForm.businessName,
        contactPerson: quoteForm.contactPerson,
        phone: quoteForm.phone,
        email: quoteForm.email,
        preferredDeliveryLocation: quoteForm.preferredDeliveryLocation,
        city: quoteForm.city,
        state: quoteForm.state,
        additionalMessage: quoteForm.additionalMessage,
        items: [
          {
            productId: quoteTargetProduct._id,
            productName: quoteTargetProduct.name,
            brand: quoteTargetProduct.brand,
            modelName: quoteTargetProduct.modelName,
            variant: `${quoteTargetProduct.ram || ''} ${quoteTargetProduct.storage || ''} ${quoteTargetProduct.color || ''}`.trim(),
            quantity: quoteForm.quantity,
          },
        ],
      };

      const res = await fetch('/api/public/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setQuoteFeedback({
          type: 'success',
          message: data.message,
          quoteNumber: data.quoteNumber,
        });
        setQuoteForm({
          businessName: '',
          contactPerson: '',
          phone: '',
          email: '',
          quantity: 10,
          preferredDeliveryLocation: 'Bangalore Central DC',
          city: 'Bangalore',
          state: 'Karnataka',
          additionalMessage: '',
        });
      } else {
        setQuoteFeedback({
          type: 'error',
          message: data.error || 'Failed to submit quotation request.',
        });
      }
    } catch (err: any) {
      setQuoteFeedback({
        type: 'error',
        message: err.message || 'Network error occurred.',
      });
    } finally {
      setQuoteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-900 font-sans selection:bg-[#5428E8] selection:text-white pb-20">
      {/* =========================================================================
          1. TOP NAVIGATION BAR (Exact brand match with B2B Homepage)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#080B1A]/95 backdrop-blur-xl border-b border-white/10 text-white shadow-xl shadow-black/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3.5">
          {/* Brand Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#5428E8] to-[#8055F7] p-0.5 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0E122A]">
                <Smartphone className="h-5 w-5 text-indigo-400 group-hover:text-white transition" />
              </div>
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white block leading-tight">
                APEX ELECTRONICS
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block">
                B2B Distribution
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold tracking-wide text-slate-300">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/catalog" className="text-indigo-400 font-bold transition flex items-center gap-1">
              <span>Catalog</span>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300 font-mono">
                {totalProducts}
              </span>
            </Link>
            <Link href="/#calculator" className="hover:text-white transition">ROI Calculator</Link>
            <Link href="/#brands" className="hover:text-white transition">Brands</Link>
            <Link href="/#network" className="hover:text-white transition">Logistics</Link>
            <Link href="/#partnership" className="hover:text-white transition">Partner Application</Link>
            <Link href="/#contact" className="hover:text-white transition">Contact</Link>
          </nav>

          {/* Right Header Actions */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              onClick={() => openQuoteModalFor()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3.5 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Request Quote</span>
            </button>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/10 hover:border-white/25 transition"
            >
              <Lock className="h-3.5 w-3.5 text-indigo-400" />
              <span>{isDealerAuthorized ? 'Dealer Active' : 'Dealer Login'}</span>
            </Link>

            <Link
              href="/#partnership"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition"
            >
              <span>Become Retailer</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 p-2 text-indigo-300 text-xs font-bold flex items-center gap-1"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-[#5428E8] text-white text-[10px] h-4 w-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0E122A] border-b border-white/10 px-6 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col space-y-3 text-sm font-semibold text-slate-300">
              <Link onClick={() => setMobileMenuOpen(false)} href="/" className="hover:text-white">Home</Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/catalog" className="text-indigo-400 font-bold">Catalog</Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/#calculator" className="hover:text-white">ROI Calculator</Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/#brands" className="hover:text-white">Brands</Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/#network" className="hover:text-white">Distribution Logistics</Link>
              <Link onClick={() => setMobileMenuOpen(false)} href="/#partnership" className="hover:text-white">Retailer Partnership</Link>
            </nav>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openQuoteModalFor();
                }}
                className="w-full text-center rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-2.5 text-xs font-bold text-white shadow-md"
              >
                Request Bulk Quotation
              </button>
              <Link
                href="/login"
                className="w-full text-center rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
              >
                Partner &amp; Staff Login
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. EDITORIAL FEATURED PROMOTION BANNER
          ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#080B1A] via-[#101438] to-[#0A0D1F] text-white py-12 md:py-16 border-b border-indigo-950">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-[#5428E8]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-xs font-medium text-indigo-300/80 mb-2">
                <Link href="/" className="hover:text-white transition">Home</Link>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-white font-bold">Technology Catalog</span>
                {selectedCategory !== 'ALL' && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-indigo-400 capitalize">{selectedCategory.toLowerCase()}</span>
                  </>
                )}
              </nav>

              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>OFFICIAL WHOLESALE INVENTORY &bull; DIRECT OEM SUPPLY</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Technology That Moves Business Forward.
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Explore our commercial portfolio of authentic 5G smartphones, enterprise tablets, wireless audio, and gallium nitride chargers. Sourced with complete IMEI traceability and manufacturer warranty.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    const el = document.getElementById('catalog-grid-top');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="rounded-2xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:opacity-95 transition flex items-center gap-2"
                >
                  <span>Explore Collection ({totalProducts})</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => openQuoteModalFor()}
                  className="rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/10 transition"
                >
                  Request Bulk Quotation
                </button>
              </div>
            </div>

            {/* Quick Stats Pill Panel */}
            <div className="lg:col-span-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">
                DISTRIBUTION NETWORK STATUS
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-black/20 p-3 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Active SKUs</span>
                  <span className="font-mono text-lg font-black text-white">{totalProducts} Devices</span>
                </div>
                <div className="rounded-2xl bg-black/20 p-3 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">OEM Brands</span>
                  <span className="font-mono text-lg font-black text-indigo-300">{brands.length} Verified</span>
                </div>
                <div className="rounded-2xl bg-black/20 p-3 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Dispatch SLA</span>
                  <span className="font-mono text-lg font-black text-emerald-400">Same-Day</span>
                </div>
                <div className="rounded-2xl bg-black/20 p-3 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Dealer Pricing</span>
                  <span className="font-mono text-sm font-black text-amber-300">
                    {isDealerAuthorized ? 'Unlocked ✓' : 'Protected 🔒'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                {isDealerAuthorized
                  ? 'Authenticated dealer partner session active. Showing private wholesale prices.'
                  : 'Authorized dealer login required to view private wholesale price lists.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. CATEGORY NAVIGATION BAR (Scrollable Pills with Live Counts)
          ========================================================================= */}
      <section className="bg-white border-b border-slate-200 shadow-sm sticky top-[69px] z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] || LayoutGrid;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#5428E8] text-white shadow-md shadow-[#5428E8]/30 scale-102'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{cat.title}</span>
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. MAIN CATALOG BODY (Filter Sidebar + Responsive Product Grid)
          ========================================================================= */}
      <main id="catalog-grid-top" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Control Bar: Search, Sort & View Mode */}
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Smart Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by model, brand, processor, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#5428E8] focus:bg-white focus:ring-2 focus:ring-[#5428E8]/10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Right Controls: Sort, Active Count, View Mode */}
          <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Showing <strong className="text-slate-900">{products.length}</strong> of{' '}
              <strong className="text-slate-900">{totalProducts}</strong> products
            </span>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#5428E8]"
              >
                <option value="featured">Featured &amp; Recommended</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
                <option value="name_asc">Brand &bull; A to Z</option>
              </select>
            </div>

            {/* Grid vs List View */}
            <div className="hidden sm:flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white text-[#5428E8] shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid View"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-white text-[#5428E8] shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Layout: Sidebar Filter (Desktop) + Products Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* =========================================================================
              SIDEBAR FILTERS (Desktop)
              ========================================================================= */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6 rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm sticky top-[140px] max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#5428E8]" />
                <h3 className="font-extrabold text-sm text-slate-900">Refine Catalog</h3>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Clear ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Brand Filter */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Brand / Manufacturer
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {brands.map((b) => {
                  const isChecked = selectedBrands.includes(b.name);
                  return (
                    <label
                      key={b.name}
                      className="flex items-center justify-between text-xs font-medium text-slate-700 hover:text-[#5428E8] cursor-pointer py-1"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBrand(b.name)}
                          className="rounded border-slate-300 text-[#5428E8] focus:ring-[#5428E8]/20 h-4 w-4"
                        />
                        <span>{b.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">({b.count})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Price Range Slider */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Maximum Price
                </span>
                <span className="font-mono text-xs font-black text-[#5428E8]">
                  ₹{priceRange[1].toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min={1000}
                max={200000}
                step={5000}
                value={priceRange[1]}
                onChange={(e) => {
                  setPriceRange([priceRange[0], Number(e.target.value)]);
                  setPage(1);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#5428E8]"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>₹1,000</span>
                <span>₹2,00,000</span>
              </div>
            </div>

            {/* RAM Filter */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                RAM Variant
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['4GB', '6GB', '8GB', '12GB', '16GB'].map((ramVal) => {
                  const isSelected = selectedRAMs.includes(ramVal);
                  return (
                    <button
                      key={ramVal}
                      type="button"
                      onClick={() => toggleRAM(ramVal)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        isSelected
                          ? 'bg-[#5428E8] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {ramVal}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Storage Filter */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Internal Storage
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['64GB', '128GB', '256GB', '512GB', '1TB'].map((stVal) => {
                  const isSelected = selectedStorages.includes(stVal);
                  return (
                    <button
                      key={stVal}
                      type="button"
                      onClick={() => toggleStorage(stVal)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        isSelected
                          ? 'bg-[#5428E8] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {stVal}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stock Availability */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Stock Status
              </span>
              <div className="space-y-1 text-xs">
                {[
                  { id: '', label: 'All Items' },
                  { id: 'IN_STOCK', label: 'In Stock (Warehouse)' },
                  { id: 'LOW_STOCK', label: 'Limited Allocation' },
                ].map((st) => (
                  <label
                    key={st.id}
                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 py-1"
                  >
                    <input
                      type="radio"
                      name="availability"
                      checked={selectedAvailability === st.id}
                      onChange={() => {
                        setSelectedAvailability(st.id);
                        setPage(1);
                      }}
                      className="text-[#5428E8] focus:ring-[#5428E8]/20"
                    />
                    <span>{st.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Warranty Filter */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Minimum Warranty
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { months: null, label: 'Any' },
                  { months: 12, label: '1 Year+' },
                  { months: 18, label: '18 Mo+' },
                  { months: 36, label: '3 Years' },
                ].map((w) => (
                  <button
                    key={w.label}
                    type="button"
                    onClick={() => {
                      setSelectedWarranty(w.months);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedWarranty === w.months
                        ? 'bg-[#5428E8] text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* =========================================================================
              PRODUCTS GRID AREA
              ========================================================================= */}
          <div className="lg:col-span-9 space-y-6">
            {/* Loading Skeletons */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 animate-pulse shadow-sm"
                  >
                    <div className="h-48 w-full bg-slate-200 rounded-2xl" />
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-8 bg-slate-200 rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Smartphone className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Your product collection is being prepared.
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No active devices matched your search or selected filter combination. Adjust your criteria or reset the filters to browse all verified hardware.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-xl bg-[#5428E8] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#431ecd] transition"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Grid View Mode */}
            {!loading && products.length > 0 && viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((p) => {
                  const isCompared = Boolean(comparedProducts.find((cp) => cp._id === p._id));
                  return (
                    <div
                      key={p._id}
                      className="group relative rounded-3xl border border-slate-200/90 bg-white overflow-hidden transition-all duration-300 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
                    >
                      {/* Product Image Header with Badges */}
                      <div className="relative h-56 w-full bg-gradient-to-b from-slate-100 to-slate-50 p-4 flex items-center justify-center overflow-hidden">
                        <img
                          src={
                            p.photograph ||
                            'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=600&q=80'
                          }
                          alt={p.name}
                          className="h-full max-h-48 w-auto object-contain group-hover:scale-108 transition duration-500"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                          <span className="rounded-lg bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-black uppercase text-white tracking-wider">
                            {p.brand}
                          </span>
                          {p.requiresImei && (
                            <span className="rounded-lg bg-indigo-600/90 text-white px-2 py-0.5 text-[9px] font-mono font-bold">
                              DUAL IMEI
                            </span>
                          )}
                        </div>

                        {/* Right Quick Action: Quick View Trigger */}
                        <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-90 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setQuickViewProduct(p)}
                            className="h-8 w-8 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-[#5428E8] hover:bg-white flex items-center justify-center shadow-sm transition"
                            title="Quick View Specifications"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Stock Status Pill */}
                        <div className="absolute bottom-3 left-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border flex items-center gap-1 ${
                              p.stockStatus === 'IN_STOCK'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                p.stockStatus === 'IN_STOCK' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                              }`}
                            />
                            <span>{p.stockStatus === 'IN_STOCK' ? 'In Stock' : 'Low Allocation'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-mono">
                            <span>SKU: {p.sku}</span>
                            <span>{p.warrantyPeriodMonths || 12}M Warranty</span>
                          </div>

                          <Link
                            href={`/catalog/${p._id}`}
                            className="block font-extrabold text-sm text-slate-900 group-hover:text-[#5428E8] transition line-clamp-2"
                          >
                            {p.name}
                          </Link>

                          {/* Variants chips */}
                          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                            {p.ram && (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                                {p.ram} RAM
                              </span>
                            )}
                            {p.storage && (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                                {p.storage} ROM
                              </span>
                            )}
                            {p.color && (
                              <span className="rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5 font-bold">
                                {p.color}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pricing Strip */}
                        <div className="pt-3 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <span className="text-[10px] uppercase text-slate-400 font-bold block">
                                Retail MRP
                              </span>
                              <span className="font-mono text-base font-black text-slate-900">
                                ₹{p.mrp.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* B2B Dealer Price logic */}
                            <div className="text-right">
                              <span className="text-[10px] uppercase text-indigo-600 font-bold block">
                                Dealer Wholesale
                              </span>
                              {p.dealerPrice ? (
                                <span className="font-mono text-base font-black text-emerald-600">
                                  ₹{p.dealerPrice.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <Link
                                  href="/login"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                                >
                                  <Lock className="h-3 w-3" />
                                  <span>Login to view</span>
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCompare(p)}
                              className={`flex-1 rounded-xl py-2 text-xs font-bold border transition text-center ${
                                isCompared
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {isCompared ? '✓ Compared' : 'Compare'}
                            </button>

                            <button
                              type="button"
                              onClick={() => openQuoteModalFor(p)}
                              className="flex-1 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition text-center"
                            >
                              Request Quote
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View Mode */}
            {!loading && products.length > 0 && viewMode === 'list' && (
              <div className="space-y-4">
                {products.map((p) => {
                  const isCompared = Boolean(comparedProducts.find((cp) => cp._id === p._id));
                  return (
                    <div
                      key={p._id}
                      className="group rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm hover:border-indigo-400 hover:shadow-lg transition flex flex-col md:flex-row items-center gap-6"
                    >
                      <div className="h-40 w-40 shrink-0 bg-slate-50 rounded-2xl p-3 flex items-center justify-center">
                        <img
                          src={
                            p.photograph ||
                            'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=600&q=80'
                          }
                          alt={p.name}
                          className="h-full w-auto object-contain group-hover:scale-105 transition"
                        />
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded-lg bg-slate-900 text-white font-black px-2 py-0.5 text-[10px]">
                            {p.brand}
                          </span>
                          <span className="font-mono text-slate-500">SKU: {p.sku}</span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-slate-600 font-medium">{p.warrantyPeriodMonths || 12}M Warranty</span>
                        </div>

                        <Link
                          href={`/catalog/${p._id}`}
                          className="block text-base font-extrabold text-slate-900 hover:text-[#5428E8] transition"
                        >
                          {p.name}
                        </Link>

                        <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>

                        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                          {p.processor && (
                            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-medium">
                              {p.processor}
                            </span>
                          )}
                          {p.displaySpecs && (
                            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-medium">
                              {p.displaySpecs}
                            </span>
                          )}
                          {p.batterySpecs && (
                            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-medium">
                              {p.batterySpecs}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-full md:w-56 shrink-0 md:border-l md:border-slate-100 md:pl-6 space-y-3">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">Retail MRP</span>
                          <span className="font-mono text-lg font-black text-slate-900">
                            ₹{p.mrp.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase text-indigo-600 font-bold block">
                            Wholesale Dealer Price
                          </span>
                          {p.dealerPrice ? (
                            <span className="font-mono text-lg font-black text-emerald-600">
                              ₹{p.dealerPrice.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <Link href="/login" className="text-xs font-bold text-indigo-600 hover:underline">
                              Login for private pricing
                            </Link>
                          )}
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => openQuoteModalFor(p)}
                            className="w-full rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition"
                          >
                            Request Quote
                          </button>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleCompare(p)}
                              className={`flex-1 rounded-xl py-1.5 text-xs font-bold border transition ${
                                isCompared
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              {isCompared ? '✓ Compared' : 'Compare'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickViewProduct(p)}
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 hover:text-[#5428E8]"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="pt-6 flex items-center justify-between border-t border-slate-200">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((prev) => Math.max(1, prev - 1));
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  &larr; Previous Page
                </button>

                <span className="text-xs font-bold text-slate-500 font-mono">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((prev) => Math.min(totalPages, prev + 1));
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  Next Page &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* =========================================================================
          5. COMPARISON TRAY (Fixed at Bottom when Products are selected)
          ========================================================================= */}
      {comparedProducts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080B1A]/95 border-t border-white/10 backdrop-blur-xl py-3 px-4 shadow-2xl text-white">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold">
                Comparison Tray ({comparedProducts.length}/4):
              </span>
              <div className="hidden sm:flex items-center gap-2">
                {comparedProducts.map((cp) => (
                  <div
                    key={cp._id}
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1 text-xs"
                  >
                    <span className="font-bold truncate max-w-[120px]">{cp.modelName || cp.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleCompare(cp)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setComparedProducts([])}
                className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setComparisonModalOpen(true)}
                className="rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition"
              >
                Compare Now ({comparedProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. COMPARISON TABLE MODAL
          ========================================================================= */}
      {comparisonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Hardware Specifications Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Side-by-side technical and commercial comparison across {comparedProducts.length} selected devices.
                </p>
              </div>
              <button
                onClick={() => setComparisonModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-3 bg-slate-50 font-bold text-slate-400 uppercase w-36">Device</th>
                    {comparedProducts.map((p) => (
                      <th key={p._id} className="p-3 min-w-[200px]">
                        <div className="space-y-2">
                          <img
                            src={p.photograph}
                            alt={p.name}
                            className="h-24 w-auto object-contain mx-auto"
                          />
                          <span className="font-extrabold text-slate-900 block text-center">
                            {p.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => openQuoteModalFor(p)}
                            className="w-full rounded-xl bg-[#5428E8] py-1.5 text-[11px] font-bold text-white shadow-sm"
                          >
                            Quote Device
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-500">Brand</td>
                    {comparedProducts.map((p) => (
                      <td key={p._id} className="p-3 font-semibold">{p.brand}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-500">Retail MRP</td>
                    {comparedProducts.map((p) => (
                      <td key={p._id} className="p-3 font-mono font-bold text-slate-900">
                        ₹{p.mrp.toLocaleString('en-IN')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-500">Wholesale Price</td>
                    {comparedProducts.map((p) => (
                      <td key={p._id} className="p-3 font-mono font-bold text-emerald-600">
                        {p.dealerPrice ? `₹${p.dealerPrice.toLocaleString('en-IN')}` : '🔒 Protected'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-500">RAM &amp; Storage</td>
                    {comparedProducts.map((p) => (
                      <td key={p._id} className="p-3">
                        {p.ram || 'N/A'} RAM &bull; {p.storage || 'N/A'} ROM
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-500">Processor / SoC</td>
                    {comparedProducts.map((p) => (
                      <td key={p._id} className="p-3">{p.processor || 'Standard Architecture'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-500">Display</td>
                    {comparedProducts.map((p) => (
                      <td key={p._id} className="p-3">{p.displaySpecs || 'Standard Display'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-500">Battery &amp; Charging</td>
                    {comparedProducts.map((p) => (
                      <td key={p._id} className="p-3">{p.batterySpecs || 'Standard Battery'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-500">Warranty</td>
                    {comparedProducts.map((p) => (
                      <td key={p._id} className="p-3">{p.warrantyPeriodMonths || 12} Months Brand Warranty</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-500">HSN &amp; GST</td>
                    {comparedProducts.map((p) => (
                      <td key={p._id} className="p-3 font-mono">
                        HSN {p.hsnCode || '85171200'} ({p.gstRatePercent || 18}%)
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. PRODUCT QUICK VIEW MODAL
          ========================================================================= */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="rounded-lg bg-slate-900 text-white font-black px-2.5 py-1 text-xs uppercase">
                {quickViewProduct.brand} &bull; QUICK VIEW
              </span>
              <button
                onClick={() => setQuickViewProduct(null)}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-72 bg-slate-50 rounded-2xl p-6 flex items-center justify-center">
                <img
                  src={quickViewProduct.photograph}
                  alt={quickViewProduct.name}
                  className="h-full w-auto object-contain"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-mono text-slate-400">SKU: {quickViewProduct.sku}</span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                    {quickViewProduct.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                    {quickViewProduct.description}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 space-y-2 border border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Processor:</span>
                    <span className="font-semibold text-slate-800">{quickViewProduct.processor || 'High-Performance SoC'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Display:</span>
                    <span className="font-semibold text-slate-800">{quickViewProduct.displaySpecs || 'Custom Display'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Battery:</span>
                    <span className="font-semibold text-slate-800">{quickViewProduct.batterySpecs || 'Fast-Charge Battery'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Warranty:</span>
                    <span className="font-semibold text-indigo-600">{quickViewProduct.warrantyPeriodMonths || 12} Months</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Retail MRP</span>
                    <span className="font-mono text-lg font-black text-slate-900">
                      ₹{quickViewProduct.mrp.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-indigo-600 uppercase font-bold block">Wholesale Price</span>
                    <span className="font-mono text-lg font-black text-emerald-600">
                      {quickViewProduct.dealerPrice ? `₹${quickViewProduct.dealerPrice.toLocaleString('en-IN')}` : '🔒 Protected'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const p = quickViewProduct;
                      setQuickViewProduct(null);
                      openQuoteModalFor(p);
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-2.5 text-xs font-bold text-white shadow-md text-center"
                  >
                    Request Bulk Quote
                  </button>

                  <Link
                    href={`/catalog/${quickViewProduct._id}`}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-800 text-center hover:bg-slate-50 transition"
                  >
                    Full Details &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. B2B QUOTE REQUEST MODAL
          ========================================================================= */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5428E8] text-white">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Request Wholesale Quotation</h3>
                  <p className="text-[11px] text-slate-500">Direct distributor pricing &bull; Official GST Invoicing</p>
                </div>
              </div>
              <button
                onClick={() => setQuoteModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {quoteFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 ${
                  quoteFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {quoteFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <p>{quoteFeedback.message}</p>
                  {quoteFeedback.quoteNumber && (
                    <p className="mt-1 font-mono font-bold">Reference: {quoteFeedback.quoteNumber}</p>
                  )}
                </div>
              </div>
            )}

            {/* Target Product Summary Box */}
            {quoteTargetProduct && (
              <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100 p-3.5 flex items-center gap-3">
                <img
                  src={quoteTargetProduct.photograph}
                  alt={quoteTargetProduct.name}
                  className="h-14 w-14 object-contain rounded-xl bg-white p-1"
                />
                <div className="flex-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 block">
                    {quoteTargetProduct.brand} &bull; SKU: {quoteTargetProduct.sku}
                  </span>
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {quoteTargetProduct.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-600">
                    MRP: ₹{quoteTargetProduct.mrp.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleQuoteSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business / Retail Store Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Mobile Hub"
                    value={quoteForm.businessName}
                    onChange={(e) => setQuoteForm({ ...quoteForm, businessName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Proprietor / Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikas Malhotra"
                    value={quoteForm.contactPerson}
                    onChange={(e) => setQuoteForm({ ...quoteForm, contactPerson: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9811002233"
                    value={quoteForm.phone}
                    onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="procurement@store.com"
                    value={quoteForm.email}
                    onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Required Quantity (Units) *</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={quoteForm.quantity}
                    onChange={(e) => setQuoteForm({ ...quoteForm, quantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 font-mono font-bold focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Bangalore"
                    value={quoteForm.city}
                    onChange={(e) => setQuoteForm({ ...quoteForm, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="Karnataka"
                    value={quoteForm.state}
                    onChange={(e) => setQuoteForm({ ...quoteForm, state: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Commercial Notes / Target Price</label>
                <textarea
                  rows={2}
                  placeholder="Specify target delivery timeline, preferred billing entity, or batch requirements..."
                  value={quoteForm.additionalMessage}
                  onChange={(e) => setQuoteForm({ ...quoteForm, additionalMessage: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#5428E8] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuoteModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quoteSubmitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition disabled:opacity-50"
                >
                  {quoteSubmitting ? 'Transmitting Request...' : 'Submit Quotation Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          9. MOBILE SLIDE-OUT FILTER DRAWER
          ========================================================================= */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="w-full max-w-xs h-full bg-white p-6 overflow-y-auto space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#5428E8]" />
                <h3 className="font-extrabold text-sm text-slate-900">Filters</h3>
              </div>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Brands */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-slate-400 block">Brands</span>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {brands.map((b) => (
                  <label key={b.name} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(b.name)}
                        onChange={() => toggleBrand(b.name)}
                      />
                      <span>{b.name}</span>
                    </div>
                    <span className="text-slate-400">({b.count})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold uppercase text-slate-400 block">
                Max Price: ₹{priceRange[1].toLocaleString('en-IN')}
              </span>
              <input
                type="range"
                min={1000}
                max={200000}
                step={5000}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="w-full h-2 bg-slate-200 rounded-lg accent-[#5428E8]"
              />
            </div>

            {/* RAM */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold uppercase text-slate-400 block">RAM</span>
              <div className="flex flex-wrap gap-1">
                {['4GB', '6GB', '8GB', '12GB', '16GB'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRAM(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      selectedRAMs.includes(r) ? 'bg-[#5428E8] text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 rounded-xl bg-[#5428E8] py-2.5 text-xs font-bold text-white shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
