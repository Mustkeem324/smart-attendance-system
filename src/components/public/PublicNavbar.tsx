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
  ChevronDown,
  Truck,
  FileText,
  PhoneCall,
  CheckCircle2,
  ExternalLink,
  Store,
  Layers,
  Radio,
  BarChart3,
  Users,
  ShieldCheck,
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
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productCount, setProductCount] = useState<number | null>(
    typeof totalProductsCount === 'number' && totalProductsCount > 0
      ? totalProductsCount
      : null
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close features dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setFeaturesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        setFeaturesDropdownOpen(false);
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

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (isHome) {
      e.preventDefault();
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', hash);
      }
    }
    setMobileMenuOpen(false);
    setFeaturesDropdownOpen(false);
  };

  const featurePortals = [
    {
      name: 'Enterprise Distribution Hub',
      desc: '23 B2B modules, warehouses, orders, invoices & ledger',
      href: '/distribution',
      icon: Building2,
      badge: '23 Modules',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      name: 'Field Sales Mobile App',
      desc: 'GPS visit check-in, camera photos, catalog sales & IMEI',
      href: '/field-sales/mobile',
      icon: Smartphone,
      badge: 'Mobile App',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      name: 'HRMS & Attendance Portal',
      desc: 'Biometric anti-spoof telemetry, shift rosters & leaves',
      href: '/admin/dashboard',
      icon: Users,
      badge: 'HR Suite',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      name: 'Wholesale Product Catalog',
      desc: '21 genuine commercial smartphones, tablets & accessories',
      href: '/catalog',
      icon: ShoppingBag,
      badge: `${productCount || 21} SKUs`,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      name: 'Retailer & Dealer Directory',
      desc: 'Certified dealer network, shop profiles & credit limits',
      href: '/field-sales/shops',
      icon: Store,
      badge: 'Dealers',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      name: 'Live Telemetry & Radar',
      desc: 'Real-time geofence enforcement & biometric punch stream',
      href: '/admin/attendance/live',
      icon: Radio,
      badge: 'LIVE',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
    },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[#07091B]/95 backdrop-blur-xl border-b border-[#20274E] shadow-xl shadow-black/40 py-2.5'
            : 'bg-[#090C22]/90 backdrop-blur-md border-b border-white/5 py-3 sm:py-3.5'
        }`}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 lg:gap-4">
          {/* ===================================================================
              1. LEFT: Brand Identity (Logo, Company, B2B Subtitle)
              =================================================================== */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group shrink-0 select-none"
            title="APEX Electronics — Home"
          >
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#602BF7] via-[#7544F8] to-[#8E5FF9] p-0.5 shadow-md shadow-purple-900/40 group-hover:shadow-purple-700/50 group-hover:scale-105 transition-all">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0A0D26]">
                <Smartphone className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-purple-400 group-hover:text-white transition-colors" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-black tracking-tight text-white block leading-tight font-sans">
                SALMAN ENTERPRISES
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-purple-400 block leading-tight">
                B2B DISTRIBUTION
              </span>
            </div>
          </Link>

          {/* ===================================================================
              2. CENTER: Primary Navigation Links & Features Dropdown
              =================================================================== */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-semibold tracking-wide text-slate-300"
          >
            {/* Home */}
            <Link
              href="/"
              className={`px-2 py-1.5 rounded-lg transition-colors ${
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
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors ${
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

            {/* All Features & Portals Dropdown Menu */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${
                  featuresDropdownOpen
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
                    : 'hover:text-white hover:bg-white/5 text-slate-300'
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

              {/* Dropdown Popover */}
              {featuresDropdownOpen && (
                <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-[#273062] bg-[#0A0D26]/98 p-2.5 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                  <div className="px-2.5 py-1.5 border-b border-white/5 mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                      Platform Portals &amp; Modules
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">Switch Portals</span>
                  </div>

                  <div className="space-y-1">
                    {featurePortals.map((portal) => {
                      const Icon = portal.icon;
                      return (
                        <Link
                          key={portal.name}
                          href={portal.href}
                          onClick={() => setFeaturesDropdownOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
                        >
                          <div className="p-1.5 rounded-lg bg-white/5 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors mt-0.5 shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white group-hover:text-purple-200 truncate">
                                {portal.name}
                              </span>
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${portal.badgeColor}`}
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

                  <div className="mt-2 pt-2 border-t border-white/5 px-2 flex items-center justify-between text-[10px] text-slate-400">
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
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
            >
              <Calculator className="h-3.5 w-3.5 text-purple-400" />
              <span>ROI Calculator</span>
            </a>

            {/* Brands */}
            <a
              href={getAnchorHref('#brands')}
              onClick={(e) => handleAnchorClick(e, '#brands')}
              className="px-2 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
            >
              Brands
            </a>

            {/* Logistics */}
            <a
              href={getAnchorHref('#network')}
              onClick={(e) => handleAnchorClick(e, '#network')}
              className="px-2 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
            >
              Logistics
            </a>

            {/* Partner Application */}
            <a
              href={getAnchorHref('#partnership')}
              onClick={(e) => handleAnchorClick(e, '#partnership')}
              className="px-2 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
            >
              Partner App
            </a>

            {/* Contact */}
            <a
              href={getAnchorHref('#contact')}
              onClick={(e) => handleAnchorClick(e, '#contact')}
              className="px-2 py-1.5 rounded-lg hover:text-white hover:bg-white/5 text-slate-300 transition-colors"
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
              3. RIGHT: Actions (Mobile App + Enterprise Hub + Login + Become Retailer)
              =================================================================== */}
          <div className="hidden sm:flex items-center gap-1.5 lg:gap-2 shrink-0">
            {/* Search Trigger for Tablet/Mobile */}
            <button
              type="button"
              onClick={handleOpenSearch}
              className="lg:hidden flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
              title="Search Catalog"
              aria-label="Search Catalog"
            >
              <Search className="h-4 w-4 text-purple-400" />
            </button>

            {/* Field Sales Mobile App Quick Switcher */}
            <Link
              href="/field-sales/mobile"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/25 bg-[#141938]/90 hover:bg-[#1D2452] px-2.5 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white transition-all shadow-sm"
              title="Field Sales Mobile App Interface (GPS & Dual-Photo Capture)"
            >
              <Smartphone className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Mobile App</span>
            </Link>

            {/* Enterprise Portal */}
            <Link
              href="/distribution"
              className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-purple-500/25 bg-[#17193F]/90 hover:bg-[#202456] px-2.5 lg:px-3 py-1.5 text-xs font-semibold text-purple-200 hover:text-white transition-all shadow-sm"
              title="Enterprise Distribution Management Console"
            >
              <Building2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>Enterprise Hub</span>
            </Link>

            {/* Portal Login */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-all"
              title="Dealer & Employee Login"
            >
              <Lock className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>Login</span>
            </Link>

            {/* Primary Conversion Action: Become Retailer CTA */}
            <a
              href={getAnchorHref('#partnership')}
              onClick={(e) => handleAnchorClick(e, '#partnership')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#602BF7] via-[#7139F8] to-[#804DF8] px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:brightness-110 active:scale-95 transition-all shrink-0"
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
          <div className="lg:hidden bg-[#0A0D26] border-b border-[#20274E] px-4 sm:px-6 py-5 space-y-4 animate-in slide-in-from-top-3 duration-200 shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Quick Portals Grid (4 Options) */}
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-white/10">
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/distribution"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-[#161C3D] py-2 text-xs font-bold text-purple-300 hover:bg-[#1E2552]"
              >
                <Building2 className="h-3.5 w-3.5 text-purple-400" />
                <span>Enterprise Hub</span>
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/field-sales/mobile"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-[#141A3B] py-2 text-xs font-bold text-indigo-300 hover:bg-[#1C2454]"
              >
                <Smartphone className="h-3.5 w-3.5 text-indigo-400" />
                <span>Field Sales App</span>
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/admin/dashboard"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-[#0E2028] py-2 text-xs font-bold text-emerald-300 hover:bg-[#152D39]"
              >
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                <span>HRMS Portal</span>
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/login"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white hover:bg-white/10"
              >
                <Lock className="h-3.5 w-3.5 text-purple-400" />
                <span>Portal Login</span>
              </Link>
            </div>

            {/* Full Navigation Links */}
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
                  <span>Hardware Catalog</span>
                </div>
                {productCount !== null && (
                  <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                    {productCount} SKUs
                  </span>
                )}
              </Link>

              <Link
                onClick={() => setMobileMenuOpen(false)}
                href="/field-sales/shops"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
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
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
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
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors"
              >
                <span>Manufacturer Brands</span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </a>

              <a
                onClick={(e) => handleAnchorClick(e, '#network')}
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
                onClick={(e) => handleAnchorClick(e, '#partnership')}
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
                onClick={(e) => handleAnchorClick(e, '#contact')}
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
                onClick={(e) => handleAnchorClick(e, '#partnership')}
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
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
                className="w-full rounded-2xl border border-purple-500/30 bg-white/5 py-3.5 pl-4 pr-12 text-sm text-white placeholder-slate-400 outline-none transition focus:border-purple-500 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-2 text-white shadow-md hover:brightness-110 transition-all"
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
