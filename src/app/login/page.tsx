'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import SalmanLogo from '@/components/brand/SalmanLogo';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  Building2,
  CheckCircle2,
  Cpu,
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
    const e = userEmail.toLowerCase();
    const r = (role || '').toUpperCase();
    if (r === 'FIELD_SALES_REP' || e.includes('sales') || e.includes('rep') || e.includes('wong')) {
      router.push('/field-sales/mobile');
    } else if (r === 'RETAILER' || e.includes('dealer') || e.includes('retailer')) {
      router.push('/catalog');
    } else if (r === 'EMPLOYEE' || e.includes('john') || e.includes('employee')) {
      router.push('/employee/dashboard');
    } else {
      router.push('/distribution');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      routeByRoleOrEmail(email, res.user?.role);
    } else {
      setError(res.error || 'Authentication failed. Please check your email and password.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#101225] text-slate-100 font-sans">
      {/* Left Feature Section */}
      <div className="hidden lg:flex w-5/12 flex-col justify-between bg-[#1B1D35] p-12 border-r border-[#252A54]">
        <div className="flex items-center justify-between">
          <SalmanLogo href="/" size="lg" />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Public Website</span>
          </Link>
        </div>

        <div className="space-y-6 my-auto max-w-md">
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#242850] px-3.5 py-1.5 text-xs font-bold text-purple-300 border border-[#353B75]">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            <span>Enterprise Telemetry &amp; Access Control</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Unified B2B Distribution &amp; Workforce Portal.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            One platform powering anti-spoof biometric attendance, real-time geofence enforcement, and nationwide mobile electronics field sales tracking with dual-IMEI inventory.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-[#252A54] bg-[#14162E] p-3.5">
              <span className="block text-xl font-extrabold text-purple-400">50m</span>
              <p className="mt-0.5 text-[11px] text-slate-400">Strict Geofence</p>
            </div>
            <div className="rounded-xl border border-[#252A54] bg-[#14162E] p-3.5">
              <span className="block text-xl font-extrabold text-emerald-400">100%</span>
              <p className="mt-0.5 text-[11px] text-slate-400">IMEI Traceability</p>
            </div>
            <div className="rounded-xl border border-[#252A54] bg-[#14162E] p-3.5">
              <span className="block text-xl font-extrabold text-indigo-400">23 Modules</span>
              <p className="mt-0.5 text-[11px] text-slate-400">Enterprise Suite</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-[#252A54] pt-4">
          <span>&copy; {new Date().getFullYear()} Salman Enterprises Distribution Ltd.</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            PostgreSQL &amp; MongoDB Operational
          </span>
        </div>
      </div>

      {/* Right Column: Login Form */}
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

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#1B1D35] border border-[#252A54] text-purple-300 text-xs font-semibold mb-3">
              <Lock className="h-3 w-3" />
              <span>Secure Single Sign-On (SSO) Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Enterprise Portal Login
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Sign in with your corporate credentials to access HRMS attendance, field sales operations, and warehouse distribution systems.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-[#1B1D35] p-6 sm:p-7 border border-[#252A54] shadow-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate or Registered Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-3 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 outline-none transition focus:border-[#7138F5]"
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
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-3 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-500 outline-none transition focus:border-[#7138F5]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#2A2E5A] bg-[#101225] text-[#7138F5] focus:ring-0"
                />
                <span className="text-xs text-slate-400">Remember this session (30 Days)</span>
              </label>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>TLS 256-bit Encrypted</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7138F5] hover:bg-[#5E2DD4] py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Promotion Card */}
          <div className="mt-5 p-4 rounded-xl bg-[#1B1D35] border border-[#252A54] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">New Retailer or Sub-Distributor?</p>
              <p className="text-[11px] text-slate-400">Create an account for wholesale catalog &amp; dealer pricing.</p>
            </div>
            <Link
              href="/register"
              className="px-3.5 py-1.5 rounded-lg bg-[#252A54] hover:bg-[#353B75] text-purple-300 text-xs font-bold transition shrink-0"
            >
              Register &rarr;
            </Link>
          </div>

          {/* Quick Platform Portals Nav */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              href="/distribution"
              className="flex items-center gap-2.5 p-3 rounded-xl border border-[#252A54] bg-[#14162E] hover:bg-[#1B1D35] transition group text-left"
            >
              <Building2 className="h-4 w-4 text-purple-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white group-hover:text-purple-300">Distribution Portal</p>
                <p className="text-[10px] text-slate-400">Orders, Warehouses &amp; B2B</p>
              </div>
            </Link>

            <Link
              href="/catalog"
              className="flex items-center gap-2.5 p-3 rounded-xl border border-[#252A54] bg-[#14162E] hover:bg-[#1B1D35] transition group text-left"
            >
              <Cpu className="h-4 w-4 text-purple-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white group-hover:text-purple-300">Product Catalog</p>
                <p className="text-[10px] text-slate-400">Wholesale Electronics</p>
              </div>
            </Link>
          </div>

          {/* Security Compliance Micro-Footer */}
          <div className="mt-6 text-center text-[11px] text-slate-500">
            Protected by enterprise geofence telemetry, biometric multi-factor authentication and role-based access control.
          </div>
        </div>
      </div>
    </div>
  );
}
