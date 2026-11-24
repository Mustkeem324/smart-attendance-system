'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SalmanLogo from '@/components/brand/SalmanLogo';
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
  Layers,
  ChevronRight,
  ChevronDown,
  Truck,
  FileText,
  PhoneCall,
  Store,
  Radio,
} from 'lucide-react';

interface PublicNavbarProps {
  initialProductCount?: number;
  totalProductsCount?: number;
  onOpenSearch?: () => void;
}

export default function PublicNavbar({
  initialProductCount,
  totalProductsCount,
  onOpenSearch,
}: PublicNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productCount, setProductCount] = useState<number | null>(
    totalProductsCount !== undefined
      ? totalProductsCount
      : initialProductCount !== undefined
      ? initialProductCount
      : null
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor scroll for subtle shadow/border change without glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFeaturesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setFeaturesDropdownOpen(false);
  }, [pathname]);

  // Fetch real product count from MongoDB if not provided
  useEffect(() => {
    if (productCount !== null) return;
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/public/catalog/count');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.count === 'number') {
            setProductCount(data.count);
          }
        }
      } catch (err) {
        // Fallback silently if offline
      }
    };
    fetchCount();
  }, [productCount]);

  // Keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setMobileMenuOpen(false);
        setFeaturesDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      setSearchModalOpen(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchModalOpen(false);
    router.push(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const isHome = pathname === '/';
  const isCatalog = pathname.startsWith('/catalog');

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (isHome) {
      e.preventDefault();
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setMobileMenuOpen(false);
  };

  const getAnchorHref = (hash: string) => (isHome ? hash : `/${hash}`);

  // Feature portals navigation list
  const featurePortals = [
    {
      name: 'B2B Distribution Hub',
      desc: 'National warehouse allocations, bulk stock & dealer orders',
      href: '/distribution',
      icon: Building2,
      badge: 'B2B Hub',
      badgeColor: 'bg-[#252A54] text-purple-300 border-[#353B75]',
    },
    {
      name: 'Field Sales Mobile App',
      desc: 'GPS-tagged shop visits, camera check-in & offline catalog',
      href: '/field-sales/mobile',
      icon: Smartphone,
      badge: 'Sales App',
      badgeColor: 'bg-[#252A54] text-indigo-300 border-[#353B75]',
    },
    {
      name: 'Retailer & Dealer Directory',
      desc: '1,450+ verified electronics store network & credit tiers',
      href: '/field-sales/shops',
      icon: Store,
      badge: 'Dealers',
      badgeColor: 'bg-[#252A54] text-amber-300 border-[#353B75]',
    },
    {
      name: 'Live Telemetry & Radar',
      desc: 'Real-time geofence enforcement & biometric punch stream',
      href: '/admin/attendance/live',
      icon: Radio,
      badge: 'LIVE',
      badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800',
    },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full overflow-x-clip transition-colors duration-200 bg-[#101225] border-b ${
          scrolled ? 'border-[#252A54] shadow-lg shadow-black/40 py-2.5' : 'border-[#1E2248] py-3'
        }`}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 lg:gap-4">
          {/* ===================================================================
              1. LEFT: Brand Identity (Official Salman Enterprises Logo)
              =================================================================== */}
          <SalmanLogo href="/" size="md" />

          {/* ===================================================================
              2. CENTER: Primary Navigation Links & Features Dropdown
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
                  ? 'text-white font-bold bg-[#1B1D35] border border-[#353B75] text-purple-200'
                  : 'hover:text-white hover:bg-[#1B1D35]'
              }`}
            >
              Home
            </Link>

            {/* Catalog with Real Product Count Badge */}
            <Link
              href="/catalog"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                isCatalog
                  ? 'text-white font-bold bg-[#1B1D35] border border-[#353B75] text-purple-200'
                  : 'hover:text-white hover:bg-[#1B1D35]'
              }`}
            >
              <span>Catalog</span>
              {productCount !== null && productCount > 0 && (
                <span
                  className="rounded-full bg-[#252A54] border border-[#353B75] px-1.5 py-0.2 text-[10px] text-purple-300 font-mono font-bold leading-normal"
                  title={`${productCount} Products in Database`}
                >
                  {productCount}
                </span>
              )}
            </Link>

            {/* Features Dropdown Menu */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${
                  featuresDropdownOpen
                    ? 'bg-[#1B1D35] text-purple-200 border border-[#353B75]'
                    : 'hover:text-white hover:bg-[#1B1D35] text-slate-300'
                }`}
                aria-expanded={featuresDropdownOpen}
                aria-haspopup="true"
              >
                <Layers className="h-3.5 w-3.5 text-purple-400" />
                <span>Features</span>
                <ChevronDown
                  className={`h-3 w-3 text-purple-300 transition-transform duration-200 ${
                    featuresDropdownOpen ? 'rotate-180 text-purple-200' : ''
                  }`}
                />
              </button>

              {/* Dropdown Popover (Solid #1B1D35) */}
              {featuresDropdownOpen && (
                <div className="absolute left-0 mt-2 w-80 rounded-xl border border-[#2A2E5A] bg-[#1B1D35] p-2.5 shadow-2xl shadow-black/80 z-50">
                  <div className="px-2.5 py-1.5 border-b border-[#252A54] mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                      Platform Portals &amp; Modules
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">Switch Portals</span>
                  </div>

                  <div className="space-y-1">
                    {featurePortals.map((portal) => {
                      const Icon = portal.icon;
                      return (
                        <Link
                          key={portal.name}
                          href={portal.href}
                          onClick={() => setFeaturesDropdownOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#252A54] transition-colors group"
                        >
                          <div className="p-1.5 rounded-md bg-[#101225] text-purple-400 group-hover:text-purple-300 transition-colors mt-0.5 shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white group-hover:text-purple-200 truncate">
                                {portal.name}
                              </span>
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md border shrink-0 ${portal.badgeColor}`}
                              >
                                {portal.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {portal.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#252A54] px-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Database: PostgreSQL + MongoDB</span>
                    <Link
                      href="/distribution"
                      onClick={() => setFeaturesDropdownOpen(false)}
                      className="text-purple-400 font-bold hover:underline"
                    >
                      View All →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ROI Calculator */}
            <a
              href={getAnchorHref('#calculator')}
              onClick={(e) => handleAnchorClick(e, '#calculator')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-[#1B1D35] text-slate-300 transition-colors"
            >
              <Calculator className="h-3.5 w-3.5 text-purple-400" />
              <span>ROI Calculator</span>
            </a>

            {/* Brands */}
            <a
              href={getAnchorHref('#brands')}
              onClick={(e) => handleAnchorClick(e, '#brands')}
              className="hidden xl:inline-block px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-[#1B1D35] text-slate-300 transition-colors"
            >
              Brands
            </a>

            {/* Logistics */}
            <a
              href={getAnchorHref('#network')}
              onClick={(e) => handleAnchorClick(e, '#network')}
              className="hidden 2xl:inline-block px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-[#1B1D35] text-slate-300 transition-colors"
            >
              Logistics
            </a>

            {/* Partner Application */}
            <a
              href={getAnchorHref('#partnership')}
              onClick={(e) => handleAnchorClick(e, '#partnership')}
              className="hidden xl:inline-block px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-[#1B1D35] text-slate-300 transition-colors"
            >
              Partner App
            </a>

            {/* Contact */}
            <a
              href={getAnchorHref('#contact')}
              onClick={(e) => handleAnchorClick(e, '#contact')}
              className="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-[#1B1D35] text-slate-300 transition-colors"
            >
              Contact
            </a>

            {/* Search Icon Trigger */}
            <button
              type="button"
              onClick={handleOpenSearch}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-[#1B1D35] transition-colors border border-transparent hover:border-[#252A54]"
              title="Search Catalog (⌘K)"
              aria-label="Search Catalog"
            >
              <Search className="h-3.5 w-3.5 text-purple-400" />
            </button>
          </nav>

          {/* ===================================================================
              3. RIGHT: Actions (Mobile App + Enterprise Hub + Login + Become Retailer)
              =================================================================== */}
          <div className="hidden sm:flex items-center gap-1.5 lg:gap-2 shrink-0">
            {/* Search Trigger for Tablet */}
            <button
              type="button"
              onClick={handleOpenSearch}
              className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-[#1B1D35] border border-[#252A54] transition-colors"
              title="Search Catalog"
              aria-label="Search Catalog"
            >
              <Search className="h-4 w-4 text-purple-400" />
            </button>

            {/* Field Sales Mobile App Quick Switcher */}
            <Link
              href="/field-sales/mobile"
              className="hidden xl:inline-flex items-center gap-1.5 rounded-lg border border-[#252A54] bg-[#1B1D35] hover:bg-[#252A54] px-2.5 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white transition-all"
              title="Field Sales Mobile App Interface"
            >
              <Smartphone className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Mobile App</span>
            </Link>

            {/* Enterprise Portal */}
            <Link
              href="/distribution"
              className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-[#252A54] bg-[#1B1D35] hover:bg-[#252A54] px-2.5 lg:px-3 py-1.5 text-xs font-semibold text-purple-200 hover:text-white transition-all"
              title="Enterprise Distribution Management Console"
            >
              <Building2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>Enterprise Hub</span>
            </Link>

            {/* Portal Login */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#252A54] bg-[#1B1D35] hover:bg-[#252A54] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-all"
              title="Dealer & Employee Login"
            >
              <Lock className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>Login</span>
            </Link>

            {/* Primary Conversion Action: Become Retailer CTA */}
            <a
              href={getAnchorHref('#partnership')}
              onClick={(e) => handleAnchorClick(e, '#partnership')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#7138F5] hover:bg-[#5E2DD4] px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-950/50 active:scale-95 transition-all shrink-0"
              title="Apply for B2B Retailer Partnership"
            >
              <span>Become Retailer</span>
              <ArrowRight className="h-3.5 w-3.5 text-purple-200 shrink-0" />
            </a>
          </div>

          {/* ===================================================================
              4. MOBILE MENU TOGGLE (< lg)
              =================================================================== */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={handleOpenSearch}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#1B1D35] rounded-lg transition-colors sm:hidden"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#1B1D35] border border-[#252A54] transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* =====================================================================
            5. MOBILE NAVIGATION DRAWER (Solid #101225 / #1B1D35, Strictly No Glass)
            ===================================================================== */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#252A54] bg-[#101225] px-4 pt-3 pb-6 space-y-3">
            {/* Quick Action Buttons on Top of Drawer */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/login"
                className="flex items-center justify-center gap-2 rounded-lg border border-[#252A54] bg-[#1B1D35] py-2.5 text-xs font-bold text-white hover:bg-[#252A54] transition-colors"
              >
                <Lock className="h-3.5 w-3.5 text-purple-400" />
                <span>Portal Login</span>
              </Link>

              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/register"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#7138F5] py-2.5 text-xs font-bold text-white hover:bg-[#5E2DD4] transition-colors"
              >
                <span>Register</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Quick Navigation Links */}
            <nav className="space-y-1 text-xs text-slate-300 font-semibold pt-1">
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] hover:text-white transition-colors"
              >
                <span>Home</span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>

              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/catalog"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] text-purple-300 font-bold transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-purple-400" />
                  <span>Hardware Catalog</span>
                </div>
                {productCount !== null && (
                  <span className="text-xs font-mono bg-[#252A54] text-purple-300 px-2 py-0.5 rounded-full border border-[#353B75]">
                    {productCount} SKUs
                  </span>
                )}
              </Link>

              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/distribution"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-400" />
                  <span>Enterprise Distribution Hub</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>

              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/field-sales/mobile"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-indigo-400" />
                  <span>Field Sales Mobile Interface</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>

              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/field-sales/shops"
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-purple-400" />
                  <span>Retailer &amp; Dealer Directory</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>

              <a
                onClick={(e) => handleAnchorClick(e, '#calculator')}
                href={getAnchorHref('#calculator')}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-purple-400" />
                  <span>ROI Profit Margin Calculator</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>

              <a
                onClick={(e) => handleAnchorClick(e, '#brands')}
                href={getAnchorHref('#brands')}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] hover:text-white transition-colors"
              >
                <span>Manufacturer Brands</span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>

              <a
                onClick={(e) => handleAnchorClick(e, '#network')}
                href={getAnchorHref('#network')}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-purple-400" />
                  <span>Distribution Logistics</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>

              <a
                onClick={(e) => handleAnchorClick(e, '#partnership')}
                href={getAnchorHref('#partnership')}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-400" />
                  <span>Partner Application</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>

              <a
                onClick={(e) => handleAnchorClick(e, '#contact')}
                href={getAnchorHref('#contact')}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1B1D35] hover:text-white transition-colors"
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
                onClick={(e) => handleAnchorClick(e, '#partnership')}
                href={getAnchorHref('#partnership')}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#7138F5] hover:bg-[#5E2DD4] py-3 text-xs font-bold text-white shadow-md text-center"
              >
                <span>Apply as Authorized Retailer</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </header>

      {/* =======================================================================
          6. STANDALONE SEARCH MODAL OVERLAY (Solid Dark, No Glass)
          ======================================================================= */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-16 sm:pt-24 animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl rounded-2xl bg-[#1B1D35] border border-[#2A2E5A] p-5 sm:p-6 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-modal-title"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#252A54]">
              <div className="flex items-center gap-2 text-white">
                <Search className="h-4 w-4 text-purple-400" />
                <h3 id="search-modal-title" className="font-bold text-sm">
                  Search Wholesale Catalog
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#252A54] transition-colors"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Samsung, iPhone, 5G, Smartwatches, Chargers..."
                className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-3 pl-4 pr-12 text-sm text-white placeholder-slate-400 outline-none transition focus:border-[#7138F5]"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-2.5 rounded-lg bg-[#7138F5] hover:bg-[#5E2DD4] p-2 text-white shadow-md transition-all"
                aria-label="Execute search"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Quick tags: Flagship 5G, Apple, Samsung, GaN Chargers</span>
              <span className="hidden sm:inline">Press ESC to exit</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
