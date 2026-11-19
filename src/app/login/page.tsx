'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
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

  const routeByEmail = (userEmail: string) => {
    const e = userEmail.toLowerCase();
    if (e.includes('sales') || e.includes('rep') || e.includes('wong')) {
      router.push('/field-sales/mobile');
    } else if (e.includes('dealer') || e.includes('retailer')) {
      router.push('/field-sales/shops');
    } else if (e.includes('john') || e.includes('employee')) {
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
      routeByEmail(email);
    } else {
      setError(res.error || 'Authentication failed. Please check your corporate email and password.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#080B1A] text-slate-100">
      {/* Left Hero Graphic Section */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0c0f24] via-[#141238] to-[#080B1A] p-12 text-white lg:flex border-r border-white/5">
        {/* Glow Spheres */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#5428E8]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5428E8] to-indigo-700 shadow-lg shadow-[#5428E8]/40">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">SmartAttendance Pro</h1>
              <p className="text-[11px] text-indigo-300 font-medium">Enterprise Suite &amp; Electronics Distribution Hub</p>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Public Website</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-bold text-indigo-300 backdrop-blur">
            <Shield className="h-3.5 w-3.5 text-indigo-400" />
            <span>Enterprise Telemetry &amp; Access Control</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight text-white">
            Unified Workforce HRMS &amp; B2B Distribution Cloud.
          </h2>

          <p className="text-sm leading-relaxed text-slate-300">
            One platform powering anti-spoof biometric attendance, real-time geofence enforcement, and nationwide mobile electronics field sales tracking with dual-IMEI inventory.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur">
              <span className="block text-xl font-extrabold text-indigo-400">50m</span>
              <p className="mt-0.5 text-[11px] text-slate-400">Strict Geofence</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur">
              <span className="block text-xl font-extrabold text-emerald-400">100%</span>
              <p className="mt-0.5 text-[11px] text-slate-400">IMEI Traceability</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur">
              <span className="block text-xl font-extrabold text-purple-400">23 Modules</span>
              <p className="mt-0.5 text-[11px] text-slate-400">Enterprise Suite</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-4">
          <span>Apex Electronics &bull; Enterprise Platform</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            PostgreSQL &amp; MongoDB Operational
          </span>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex w-full flex-col justify-center px-4 py-8 sm:px-8 lg:w-1/2 lg:px-12 xl:px-16 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg">
          {/* Mobile Back & Brand */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#5428E8] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-white">SmartHRMS</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-3">
              <Lock className="h-3 w-3" />
              <span>Secure Single Sign-On (SSO) Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Enterprise Portal Login
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Sign in with your corporate credentials to access HRMS attendance, field sales operations, and warehouse distribution systems.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-300 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-xl shadow-black/20">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 outline-none transition focus:border-[#5428E8] focus:bg-white/10 focus:ring-2 focus:ring-[#5428E8]/30"
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
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
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
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-500 outline-none transition focus:border-[#5428E8] focus:bg-white/10 focus:ring-2 focus:ring-[#5428E8]/30"
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
                  className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-[#5428E8] focus:ring-0"
                />
                <span className="text-xs text-slate-400">Remember this workstation</span>
              </label>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>TLS 256-bit Encrypted</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-indigo-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-[#5428E8]/30 transition hover:from-[#431ecd] hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50"
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

          {/* Quick Platform Portals Nav */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href="/distribution"
              className="flex items-center gap-2.5 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition group text-left"
            >
              <Building2 className="h-4 w-4 text-purple-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white group-hover:text-purple-300">Distribution Portal</p>
                <p className="text-[10px] text-slate-400">Orders, Warehouses &amp; B2B</p>
              </div>
            </Link>

            <Link
              href="/catalog"
              className="flex items-center gap-2.5 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition group text-left"
            >
              <Cpu className="h-4 w-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white group-hover:text-indigo-300">Product Catalog</p>
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
