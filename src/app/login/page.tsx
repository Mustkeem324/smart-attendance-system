'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import SalmanLogo from '@/components/brand/SalmanLogo';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  Users,
  Truck,
  BarChart3,
  Package,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const routeByRoleOrEmail = (userEmail: string, role?: string) => {
    const navigateTo = (target: string) => {
      if (typeof window !== 'undefined') {
        window.location.assign(target);
      } else {
        router.push(target);
      }
    };

    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const redirectParam = params?.get('redirect');
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      navigateTo(redirectParam);
      return;
    }

    const e = userEmail.toLowerCase();
    const r = (role || '').toUpperCase();
    if (r === 'FIELD_SALES_REP' || e.includes('field') || e.includes('zaid')) {
      navigateTo('/field-sales/mobile');
    } else if (r === 'RETAILER' || r === 'DISTRIBUTOR' || e.includes('retailer')) {
      navigateTo('/catalog');
    } else if (r === 'EMPLOYEE' || r === 'INVENTORY_MANAGER' || r === 'DELIVERY_AGENT') {
      navigateTo('/employee/dashboard');
    } else {
      navigateTo('/distribution');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      try {
        if (rememberMe) {
          localStorage.setItem('se_remembered_email', email.trim());
        } else {
          localStorage.removeItem('se_remembered_email');
        }
      } catch {}
      routeByRoleOrEmail(email, res.user?.role);
    } else {
      setError(res.error || 'Authentication failed. Please check your credentials and try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#15172B] text-slate-100 font-sans selection:bg-[#6538ED]/30">
      {/* =========================================================================
          LEFT BRANDING SECTION (Enterprise Business Value)
          ========================================================================= */}
      <div className="hidden lg:flex w-5/12 flex-col justify-between bg-[#111432] p-12 xl:p-14 border-r border-[#22274F]">
        {/* Top Branding & Public Navigation */}
        <div className="flex items-center justify-between">
          <SalmanLogo href="/" size="lg" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#252A54] bg-[#161A3C] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-[#7138F5]/50 transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Public Website</span>
          </Link>
        </div>

        {/* Center Content: Headline, Description & 3 Business Highlights */}
        <div className="space-y-8 my-auto max-w-lg">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#1C214C] px-3.5 py-1.5 text-xs font-bold text-purple-300 border border-[#2E3570]">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>Business Operations Platform</span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
              One Platform.<br />
              <span className="bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
                Smarter Business Operations.
              </span>
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Manage your distribution network, workforce, attendance, inventory, and business operations through one seamless platform.
            </p>
          </div>

          {/* Three Attractive Business-Focused Highlights */}
          <div className="space-y-3.5 pt-2">
            {/* 1. Workforce Management */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-[#22274F] bg-[#141838] p-4 transition hover:border-[#7138F5]/40 hover:bg-[#181D44]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Workforce Management</h3>
                  <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/20">
                    Location-Based Attendance
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Verified team check-ins, automated shift rosters, and real-time operational availability.
                </p>
              </div>
            </div>

            {/* 2. Nationwide Distribution */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-[#22274F] bg-[#141838] p-4 transition hover:border-emerald-500/40 hover:bg-[#181D44]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Truck className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Nationwide Distribution</h3>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/20">
                    Enterprise Fulfillment
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fast order routing, regional logistics hubs, and connected retail partner channels.
                </p>
              </div>
            </div>

            {/* 3. Smart Business Operations */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-[#22274F] bg-[#141838] p-4 transition hover:border-indigo-500/40 hover:bg-[#181D44]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Smart Business Operations</h3>
                  <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/20">
                    Device &amp; Inventory Management
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time product availability, dealer pricing tiers, and integrated business insights.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Corporate Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-[#22274F] pt-5">
          <span>&copy; {new Date().getFullYear()} Salman Enterprises Distribution Ltd. All rights reserved.</span>
          <span className="flex items-center gap-2 font-medium text-purple-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Platform Active</span>
          </span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: LOGIN INTERFACE & BUSINESS PORTALS
          ========================================================================= */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:px-12 xl:px-16 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg">
          {/* Mobile Back & Brand */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
            <SalmanLogo href="/" size="sm" />
          </div>

          {/* Login Section Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#161A3C] border border-[#252A54] text-purple-300 text-xs font-semibold mb-3">
              <Lock className="h-3 w-3 text-purple-400" />
              <span>Welcome to Your Business Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome Back
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Sign in to access your business workspace and manage your operations.
            </p>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-300 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form Card */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl bg-[#141838] p-6 sm:p-7 border border-[#22274F] shadow-2xl shadow-black/40"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email or Mobile Number
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="salmanenterprisesphu@gmail.com or 9876543210"
                  className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] py-3 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 outline-none transition focus:border-[#7138F5] focus:ring-1 focus:ring-[#7138F5] disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] py-3 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-500 outline-none transition focus:border-[#7138F5] focus:ring-1 focus:ring-[#7138F5] disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={loading}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#2A2E5A] bg-[#0C0E22] text-[#7138F5] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-slate-400 hover:text-slate-300 transition">
                  Remember Me
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing In to Your Account...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Your Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* =====================================================================
              REGISTRATION SECTION (Section 6)
              ===================================================================== */}
          <div className="mt-5 rounded-2xl bg-[#141838] border border-[#22274F] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">New to Salman Enterprises?</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Register your business account to access our distribution network and business services.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#22274F] hover:bg-[#2C3366] text-purple-300 hover:text-white text-xs font-bold transition shrink-0 border border-[#323972]"
            >
              <span>Create Business Account</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* =====================================================================
              BUSINESS PORTAL ACCESS CARDS (Section 7)
              ===================================================================== */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Distribution Management */}
            <Link
              href="/distribution"
              prefetch={false}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#22274F] bg-[#111432] hover:bg-[#161A3C] hover:border-[#6538ED]/40 transition group text-left shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                  Distribution Management
                </p>
                <p className="text-[10px] text-slate-400">
                  Orders, Warehouses &amp; Business Operations.
                </p>
              </div>
            </Link>

            {/* Product Catalogue */}
            <Link
              href="/catalog"
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#22274F] bg-[#111432] hover:bg-[#161A3C] hover:border-[#7138F5]/40 transition group text-left shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                  Product Catalogue
                </p>
                <p className="text-[10px] text-slate-400">
                  Explore Products, Pricing &amp; Availability.
                </p>
              </div>
            </Link>
          </div>

          {/* Assistance Support Footer */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
            <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
            <span>Need assistance accessing your account?</span>
            <Link
              href="/contact"
              className="text-purple-400 hover:text-purple-300 font-semibold transition"
            >
              Contact Business Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
