'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight,
  ShieldCheck,
  Truck,
  ArrowLeft,
  ShoppingBag,
  Lock,
  Star,
  CheckCircle2,
  Share2,
  Clock,
  Sparkles,
  Smartphone,
  Phone,
  Mail,
  X,
  AlertCircle,
  Menu,
  ChevronDown,
} from 'lucide-react';

interface ProductDetail {
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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedRam, setSelectedRam] = useState<string>('');
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'logistics'>('overview');

  // Quote Request Modal
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteQuantity, setQuoteQuantity] = useState(10);
  const [quoteForm, setQuoteForm] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
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

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/catalog/${id}`);
        if (!res.ok) {
          throw new Error('Product not found in distributor catalog');
        }
        const data = await res.json();
        if (data.product) {
          setProduct(data.product);
          setActiveImage(data.product.photograph || '');
          setSelectedColor(data.product.color || data.product.availableColors?.[0] || '');
          setSelectedRam(data.product.ram || '');
          setSelectedStorage(data.product.storage || '');
        }
        if (data.relatedProducts) {
          setRelatedProducts(data.relatedProducts);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
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
            productId: product._id,
            productName: product.name,
            brand: product.brand,
            modelName: product.modelName,
            variant: `${selectedRam} ${selectedStorage} ${selectedColor}`.trim(),
            quantity: quoteQuantity,
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
      } else {
        setQuoteFeedback({
          type: 'error',
          message: data.error || 'Failed to submit quotation request.',
        });
      }
    } catch (err: any) {
      setQuoteFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setQuoteSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7138F5] border-t-transparent mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading verified product specifications...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 border border-slate-200 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Product Not Found</h2>
          <p className="text-xs text-slate-500">
            The requested hardware model could not be found in our active wholesale catalog.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7138F5] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#431ecd] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  const gallery = product.galleryImages && product.galleryImages.length > 0
    ? product.galleryImages
    : [product.photograph || ''];

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-900 font-sans selection:bg-[#7138F5] selection:text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#101225]  border-b border-[#252A54] text-white shadow-xl shadow-black/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3.5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#7138F5] to-[#8055F7] p-0.5 shadow-lg">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#1B1D35]">
                <Smartphone className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white block leading-tight">
                SALMAN ENTERPRISES
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block">
                B2B Distribution
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Catalog</span>
            </Link>

            <button
              onClick={() => {
                setQuoteFeedback(null);
                setQuoteModalOpen(true);
              }}
              className="rounded-xl bg-gradient-to-r from-[#7138F5] to-[#8055F7] px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition"
            >
              Request Quote
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition">Home</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <Link href="/catalog" className="hover:text-slate-900 transition">Catalog</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-500 uppercase tracking-wider">{product.category}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold truncate max-w-xs">{product.name}</span>
        </nav>

        {/* 2-Column Product Showcase Area */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT: Product Gallery & Image Zoom View */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative h-80 sm:h-96 w-full rounded-2xl bg-gradient-to-b from-slate-100 to-slate-50 p-6 flex items-center justify-center border border-slate-200/60 overflow-hidden">
              <img
                src={activeImage}
                alt={product.name}
                className="h-full max-h-80 w-auto object-contain transition-all duration-300 hover:scale-105"
              />

              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                <span className="rounded-lg bg-slate-900 text-white font-black px-2.5 py-1 text-xs uppercase tracking-wider">
                  {product.brand}
                </span>
                {product.requiresImei && (
                  <span className="rounded-lg bg-[#7138F5] text-white font-mono font-bold px-2 py-0.5 text-[10px]">
                    DUAL IMEI VALIDATED
                  </span>
                )}
              </div>

              <div className="absolute bottom-4 left-4">
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {product.stockStatus === 'IN_STOCK' ? 'In Stock (Central Warehouse)' : 'Limited Allocation'}
                  </span>
                </span>
              </div>
            </div>

            {/* Thumbnail Carousel */}
            {gallery.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {gallery.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    className={`h-20 w-20 shrink-0 rounded-xl p-2 bg-slate-50 border transition ${
                      activeImage === imgUrl
                        ? 'border-[#7138F5] ring-2 ring-[#5428E8]/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx}`} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Sourcing Trust Strip */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 block">Direct Channel Source</span>
                  <span className="text-[11px] text-slate-500">Official Brand Consignment</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 flex items-center gap-3">
                <Truck className="h-5 w-5 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 block">Express Delivery</span>
                  <span className="text-[11px] text-slate-500">24-48h Regional Dispatch</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Product Information, Variants & Pricing */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
                <span>SKU: {product.sku}</span>
                <span>BARCODE: {product.barcode || '8806095304915'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {product.name}
              </h1>

              {product.modelNumber && (
                <span className="text-xs font-mono text-indigo-600 font-semibold block mt-1">
                  Model: {product.modelNumber}
                </span>
              )}

              {product.rating && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{product.rating}</span>
                  {product.reviewCount && product.reviewCount > 0 && (
                    <span className="text-xs text-slate-400">
                      ({product.reviewCount} verified dealer reviews)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Pricing Box */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/40 p-5 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Standard Retail MRP</span>
                  <span className="font-mono text-2xl font-black text-slate-900">
                    ₹{product.mrp.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 block">
                    Dealer Wholesale Price
                  </span>
                  {product.dealerPrice ? (
                    <span className="font-mono text-2xl font-black text-emerald-600">
                      ₹{product.dealerPrice.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold shadow-sm hover:bg-indigo-700 transition"
                    >
                      <Lock className="h-3 w-3" />
                      <span>Login to View Price</span>
                    </Link>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>HSN Code: {product.hsnCode || '85171200'}</span>
                <span>GST: {product.gstRatePercent || 18}% (Rule 46 Tax Invoicing)</span>
              </div>
            </div>

            {/* Colors Selection */}
            {product.availableColors && product.availableColors.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Available Color: <strong className="text-slate-900">{selectedColor}</strong>
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.availableColors.map((clr) => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setSelectedColor(clr)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selectedColor === clr
                          ? 'border-[#7138F5] bg-indigo-50 text-[#7138F5] shadow-sm'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {clr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RAM & Storage Selection */}
            <div className="grid grid-cols-2 gap-4">
              {product.ram && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    RAM Configuration
                  </span>
                  <div className="rounded-xl border border-[#7138F5] bg-indigo-50/50 p-2.5 text-xs font-bold text-indigo-900 text-center">
                    {product.ram} High-Speed RAM
                  </div>
                </div>
              )}
              {product.storage && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Internal Storage
                  </span>
                  <div className="rounded-xl border border-[#7138F5] bg-indigo-50/50 p-2.5 text-xs font-bold text-indigo-900 text-center">
                    {product.storage} UFS 4.0 Storage
                  </div>
                </div>
              )}
            </div>

            {/* Call to Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setQuoteFeedback(null);
                  setQuoteModalOpen(true);
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-[#7138F5] to-[#8055F7] py-4 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Request Wholesale Quotation / Book Allocation</span>
              </button>

              <div className="flex gap-3">
                <a
                  href={`https://wa.me/919811002233?text=Hello%20Apex%20Distribution,%20I%20am%20inquiring%20about%20wholesale%20allocation%20for%20${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-800 text-center hover:bg-slate-50 transition"
                >
                  WhatsApp Procurement Desk
                </a>

                <Link
                  href="/#partnership"
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-800 text-center hover:bg-slate-50 transition"
                >
                  Apply as Dealer Partner
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Technical Specifications & Overview */}
        <div className="rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
          <div className="flex border-b border-slate-100 px-6 pt-4 gap-8 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 border-b-2 transition ${
                activeTab === 'overview'
                  ? 'border-[#7138F5] text-[#7138F5]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Editorial Overview
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-4 border-b-2 transition ${
                activeTab === 'specs'
                  ? 'border-[#7138F5] text-[#7138F5]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Complete Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('logistics')}
              className={`pb-4 border-b-2 transition ${
                activeTab === 'logistics'
                  ? 'border-[#7138F5] text-[#7138F5]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Wholesale Logistics &amp; Warranty
            </button>
          </div>

          <div className="p-6 sm:p-8 text-xs leading-relaxed">
            {activeTab === 'overview' && (
              <div className="space-y-4 max-w-3xl">
                <h3 className="text-base font-extrabold text-slate-900">Commercial Product Description</h3>
                <p className="text-slate-600">{product.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="font-bold text-slate-900 block mb-1">Processor</span>
                    <span className="text-slate-600">{product.processor || 'Flagship Architecture'}</span>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="font-bold text-slate-900 block mb-1">Display</span>
                    <span className="text-slate-600">{product.displaySpecs || 'Super AMOLED / High-Res'}</span>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="font-bold text-slate-900 block mb-1">Battery &amp; Charging</span>
                    <span className="text-slate-600">{product.batterySpecs || 'Fast Charging Battery'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl divide-y md:divide-y-0 divide-slate-100">
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] text-indigo-600">
                    Hardware Architecture
                  </h4>
                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Processor / SoC:</span>
                      <span className="font-semibold text-slate-900">{product.processor || 'Flagship SoC'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Screen Size:</span>
                      <span className="font-semibold text-slate-900">{product.screenSize || 'Standard Size'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Display Specifications:</span>
                      <span className="font-semibold text-slate-900">{product.displaySpecs || 'AMOLED Display'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Battery &amp; Charging:</span>
                      <span className="font-semibold text-slate-900">{product.batterySpecs || 'Standard Battery'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:pl-6">
                  <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] text-indigo-600">
                    Connectivity &amp; Tax Compliance
                  </h4>
                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Connectivity:</span>
                      <span className="font-semibold text-slate-900">{product.connectivity || '5G / Wi-Fi / BT'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">HSN Tax Classification:</span>
                      <span className="font-mono font-semibold text-slate-900">{product.hsnCode}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">GST Rate:</span>
                      <span className="font-mono font-semibold text-emerald-600">{product.gstRatePercent}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">IMEI Traceability:</span>
                      <span className="font-semibold text-indigo-600">{product.requiresImei ? 'Enforced' : 'Serialized'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logistics' && (
              <div className="space-y-4 max-w-3xl">
                <h3 className="text-base font-extrabold text-slate-900">Wholesale Terms &amp; Fulfilment SLA</h3>
                <div className="space-y-2.5 text-slate-600">
                  <p>&bull; <strong>Minimum Order Quantity (MOQ):</strong> 3 Units for Authorized Retailers.</p>
                  <p>&bull; <strong>Payment Terms:</strong> Revolving credit terms (Net 15 / Net 30) available for approved tier-1 accounts.</p>
                  <p>&bull; <strong>Logistics Corridors:</strong> Dispatched from Bangalore Central DC, Mumbai Bhiwandi Depot, or Delhi NCR Innovation Park.</p>
                  <p>&bull; <strong>Warranty Assurance:</strong> {product.warrantyPeriodMonths || 12} Months official brand warranty backed by authorized service centers nationwide.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Grid */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6 pt-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">RECOMMENDED HARDWARE</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">Similar Models &amp; Complementary Gear</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rp) => (
                <Link
                  key={rp._id}
                  href={`/catalog/${rp._id}`}
                  className="group rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm hover:border-indigo-400 hover:shadow-lg transition flex flex-col justify-between"
                >
                  <div className="h-44 w-full bg-slate-50 rounded-2xl p-4 flex items-center justify-center">
                    <img
                      src={rp.photograph}
                      alt={rp.name}
                      className="h-full w-auto object-contain group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="mt-4 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{rp.brand}</span>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#7138F5] transition line-clamp-2">
                        {rp.name}
                      </h4>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-mono text-sm font-black text-slate-900">
                        ₹{rp.mrp.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                        <span>Details</span>
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Quote Request Modal */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4  overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7138F5] text-white">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Request Wholesale Quotation</h3>
                  <p className="text-[11px] text-slate-500">Official distributor consignment inquiry</p>
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

            <form onSubmit={handleQuoteSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business / Retail Store Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Salman Mobile Hub"
                    value={quoteForm.businessName}
                    onChange={(e) => setQuoteForm({ ...quoteForm, businessName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#7138F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikas Malhotra"
                    value={quoteForm.contactPerson}
                    onChange={(e) => setQuoteForm({ ...quoteForm, contactPerson: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#7138F5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9811002233"
                    value={quoteForm.phone}
                    onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#7138F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="store@domain.com"
                    value={quoteForm.email}
                    onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#7138F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity (Units) *</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={quoteQuantity}
                    onChange={(e) => setQuoteQuantity(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 font-mono font-bold focus:border-[#7138F5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Preferred Delivery Depot / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Specify destination warehouse, target delivery schedule, or payment preferences..."
                  value={quoteForm.additionalMessage}
                  onChange={(e) => setQuoteForm({ ...quoteForm, additionalMessage: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#7138F5] focus:outline-none"
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
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#7138F5] to-[#8055F7] py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition disabled:opacity-50"
                >
                  {quoteSubmitting ? 'Submitting Request...' : 'Send Quotation Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
