'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Smartphone,
  Calculator,
  Building2,
  Lock,
  ArrowRight,
  Search,
  Menu,
  X,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  Truck,
  FileText,
  PhoneCall,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface PublicNavbarProps {
  totalProductsCount?: number;
  onOpenSearch?: () => void;
}

export default function PublicNavbar({
  totalProductsCount,
  onOpenSearch,
}: PublicNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productCount, setProductCount] = useState<number | null>(
    typeof totalProductsCount === 'number' && totalProductsCount > 0
      ? totalProductsCount
      : null
  );

  // Track scroll position for frosted glass styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch verified product count from MongoDB if not provided
  useEffect(() => {
    if (typeof totalProductsCount === 'number' && totalProductsCount > 0) {
      setProductCount(totalProductsCount);
      return;
    }

    let isMounted = true;
    fetch('/api/public/catalog/categories-brands')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && typeof data.totalProductsCount === 'number') {
          setProductCount(data.totalProductsCount);
        }
      })
      .catch(() => {
        // Gracefully hide count badge if error
      });

    return () => {
      isMounted = false;
    };
  }, [totalProductsCount]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onOpenSearch) {
          onOpenSearch();
        } else {
          setSearchModalOpen(true);
        }
      }
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  // Lock body scroll when mobile menu or search modal is open
  useEffect(() => {
    if (mobileMenuOpen || searchModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, searchModalOpen]);

  const handleOpenSearch = () => {
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      setSearchModalOpen(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchModalOpen(false);
      setMobileMenuOpen(false);
      router.push(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isHome = pathname === '/';
  const isCatalog = pathname.startsWith('/catalog');

  // Helper for cross-page anchor navigation
  const getAnchorHref = (hash: string) => {
    return isHome ? hash : `/${hash}`;
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[#07091B]/95 backdrop-blur-xl border-b border-[#20274E] shadow-xl shadow-black/40 py-2.5'
            : 'bg-[#090C22]/90 backdrop-blur-md border-b border-white/5 py-3.5 sm:py-4'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 lg:gap-6">
          {/* ===================================================================
              1. LEFT: Brand Identity (Logo, Company, B2B Subtitle)
              =================================================================== */}
          <Link
            href="/"
            className="flex items-center gap-2.5 sm:gap-3 group shrink-0 select-none"
            title="APEX Electronics — Home"
          >
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#602BF7] via-[#7544F8] to-[#8E5FF9] p-0.5 shadow-md shadow-purple-900/40 group-hover:shadow-purple-700/50 group-hover:scale-105 transition-all">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0A0D26]">
                <Smartphone className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-purple-400 group-hover:text-white transition-colors" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-black tracking-tight text-white block leading-tight font-sans">
                APEX ELECTRONICS
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-purple-400 block leading-tight">
                B2B DISTRIBUTION
              </span>
            </div>
          </Link>

          {/* ===================================================================
              2. CENTER: Primary Navigation Links
              =================================================================== */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold tracking-wide text-slate-300"
          >
            {/* Home */}
            <Link
              href="/"
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                isHome
                  ? 'text-white font-bold bg-purple-500/15 border border-purple-500/20 text-purple-200'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </Link>

            {/* Catalog with Real Product Count Badge */}
            <Link
              href="/catalog"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                isCatalog
                  ? 'text-white font-bold bg-purple-500/15 border border-purple-500/20 text-purple-200'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Catalog</span>
              {productCount !== null && productCount > 0 && (
                <span
                  className="rounded-full bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.2 text-[10px] text-purple-300 font-mono font-bold leading-normal"
                  title={`${productCount} Products in Database`}
                >
                  {productCount}
                </span>
              )}
            </Link>

            {/* ROI Calculator */}
            <a
              href={getAnchorHref('#calculator')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
            >
              <Calculator className="h-3.5 w-3.5 text-purple-400" />
              <span>ROI Calculator</span>
            </a>

            {/* Brands */}
            <a
              href={getAnchorHref('#brands')}
              className="px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
            >
              Brands
            </a>

            {/* Logistics (compacted on laptop, visible on >= 1280px) */}
            <a
              href={getAnchorHref('#network')}
              className="hidden xl:inline-flex px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
            >
              Logistics
            </a>

            {/* Partner Application (compacted on laptop, visible on >= 1280px) */}
            <a
              href={getAnchorHref('#partnership')}
              className="hidden xl:inline-flex px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
            >
              Partner Application
            </a>

            {/* Contact (compacted on laptop, visible on >= 1280px) */}
            <a
              href={getAnchorHref('#contact')}
              className="hidden xl:inline-flex px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
            >
              Contact
            </a>

            {/* Search Icon Trigger */}
            <button
              type="button"
              onClick={handleOpenSearch}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 ml-0.5"
              title="Search Catalog (⌘K)"
              aria-label="Search Catalog"
            >
              <Search className="h-3.5 w-3.5 text-purple-400" />
            </button>
          </nav>

          {/* ===================================================================
              3. RIGHT: Actions (Secondary Actions + Primary Conversion CTA)
              =================================================================== */}
          <div className="hidden sm:flex items-center gap-1.5 lg:gap-2 shrink-0">
            {/* Search on Small/Medium viewports where center nav is hidden */}
            <button
              type="button"
              onClick={handleOpenSearch}
              className="lg:hidden flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
              title="Search Catalog"
              aria-label="Search Catalog"
            >
              <Search className="h-4 w-4 text-purple-400" />
            </button>

            {/* Secondary Action 1: Enterprise Portal (2xl+ for clean desktop space) */}
            <Link
              href="/distribution"
              className="hidden 2xl:inline-flex items-center gap-1.5 rounded-xl border border-purple-500/25 bg-[#15193B]/80 hover:bg-[#1E2452] px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs font-semibold text-purple-200 hover:text-white transition-all shadow-sm"
              title="Enterprise Distribution Management Console"
            >
              <Building2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>Enterprise Portal</span>
            </Link>

            {/* Secondary Action 2: Catalog Shortcut */}
            <Link
              href="/catalog"
              className="hidden 2xl:inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 lg:py-2 text-xs font-semibold text-slate-300 hover:text-white transition-all"
              title="Open Full Hardware Catalog"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Catalog</span>
            </Link>

            {/* Secondary Action 3: Portal Login */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-200 hover:text-white transition-all"
              title="Dealer & Employee Login"
            >
              <Lock className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>Portal Login</span>
            </Link>

            {/* Primary Conversion Action: Become Retailer CTA */}
            <a
              href={getAnchorHref('#partnership')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#602BF7] via-[#7139F8] to-[#804DF8] px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:brightness-110 active:scale-95 transition-all shrink-0"
              title="Apply for B2B Retailer Partnership"
            >
              <span>Become Retailer</span>
              <ArrowRight className="h-3.5 w-3.5 text-purple-200 shrink-0" />
            </a>
          </div>

          {/* ===================================================================
              4. MOBILE MENU TOGGLE (< lg)
              =================================================================== */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <button
              type="button"
              onClick={handleOpenSearch}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              aria-label="Search Catalog"
            >
              <Search className="h-5 w-5 text-purple-400" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6 text-purple-300" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Tablet Hamburger Toggle (lg:hidden, sm:flex) */}
          <div className="hidden sm:flex lg:hidden items-center ml-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-purple-300" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ===================================================================
            5. MOBILE NAVIGATION DRAWER
            =================================================================== */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0A0D26] border-b border-[#20274E] px-4 sm:px-6 py-5 space-y-4 animate-in slide-in-from-top-3 duration-200 shadow-2xl">
            {/* Quick Actions at Top of Mobile Drawer */}
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-white/10">
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/distribution"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-[#161C3D] py-2 text-xs font-bold text-purple-300"
              >
                <Building2 className="h-3.5 w-3.5 text-purple-400" />
                <span>Enterprise Portal</span>
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/login"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white"
              >
                <Lock className="h-3.5 w-3.5 text-purple-400" />
                <span>Portal Login</span>
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col space-y-1 text-sm font-semibold text-slate-300">
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
              >
                <span>Home</span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>

              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/catalog"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 text-purple-300 font-bold transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-purple-400" />
                  <span>Products Catalog</span>
                </div>
                {productCount !== null && (
                  <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                    {productCount} Units
                  </span>
                )}
              </Link>

              <a
                onClick={() => setMobileMenuOpen(false)}
                href={getAnchorHref('#calculator')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-purple-400" />
                  <span>ROI Profit Margin Calculator</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>

              <a
                onClick={() => setMobileMenuOpen(false)}
                href={getAnchorHref('#brands')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
              >
                <span>Manufacturer Brands</span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>

              <a
                onClick={() => setMobileMenuOpen(false)}
                href={getAnchorHref('#network')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-purple-400" />
                  <span>Distribution Logistics</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>

              <a
                onClick={() => setMobileMenuOpen(false)}
                href={getAnchorHref('#partnership')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-400" />
                  <span>Partner Application</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>

              <a
                onClick={() => setMobileMenuOpen(false)}
                href={getAnchorHref('#contact')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-purple-400" />
                  <span>Contact Corporate Office</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>
            </nav>

            {/* Bottom Conversion CTA in Drawer */}
            <div className="pt-2">
              <a
                onClick={() => setMobileMenuOpen(false)}
                href={getAnchorHref('#partnership')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#602BF7] via-[#7139F8] to-[#804DF8] py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/40 text-center"
              >
                <span>Apply as Authorized Retailer</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </header>

      {/* =======================================================================
          6. STANDALONE SEARCH MODAL OVERLAY
          ======================================================================= */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-16 sm:pt-24 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl rounded-3xl bg-[#0C102C] border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-modal-title"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white">
                <Search className="h-4 w-4 text-purple-400" />
                <h3 id="search-modal-title" className="font-bold text-sm">
                  Search Wholesale Catalog
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                aria-label="Close search dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search smartphone brand, model, SKU, or specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-20 py-3 text-xs text-white placeholder-slate-400 focus:border-[#7139F8] focus:bg-white/10 focus:outline-none transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
              >
                Search
              </button>
            </form>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Popular Categories &amp; Shortcuts
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { name: 'Smartphones (5G Flagships)', q: 'Smartphones' },
                  { name: 'Apple iPhones & iPads', q: 'Apple' },
                  { name: 'Samsung Galaxy Series', q: 'Samsung' },
                  { name: 'Audio & Wireless Earbuds', q: 'Audio' },
                  { name: 'Fast GaN Chargers', q: 'Charger' },
                  { name: 'Smartwatches & Fitness', q: 'Wearables' },
                ].map((item) => (
                  <button
                    key={item.q}
                    type="button"
                    onClick={() => {
                      setSearchModalOpen(false);
                      router.push(`/catalog?q=${encodeURIComponent(item.q)}`);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 text-slate-200 hover:text-white transition-all text-left"
                  >
                    <span className="truncate">{item.name}</span>
                    <ArrowRight className="h-3 w-3 text-purple-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">ESC</kbd> to close</span>
              <Link
                onClick={() => setSearchModalOpen(false)}
                href="/catalog"
                className="text-purple-400 hover:text-purple-300 font-semibold"
              >
                Browse all products &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
