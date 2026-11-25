'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';
import SalmanLogo from '@/components/brand/SalmanLogo';
import { useAuth } from '@/context/AuthContext';

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const attempted = searchParams.get('from');
  const { user, logout } = useAuth();

  const homeHref =
    user?.role === 'RETAILER' || user?.role === 'DISTRIBUTOR'
      ? '/catalog'
      : user?.role === 'FIELD_SALES_REP'
        ? '/field-sales/mobile'
        : user?.role === 'EMPLOYEE' || user?.role === 'INVENTORY_MANAGER' || user?.role === 'DELIVERY_AGENT'
          ? '/employee/dashboard'
          : '/admin/dashboard';

  return (
    <div className="min-h-screen bg-[#15172B] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-[#252A54] bg-[#191D38] p-8 text-center shadow-2xl">
        <div className="mb-6 flex justify-center">
          <SalmanLogo href="/" size="md" />
        </div>

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EF476F]/15 border border-[#EF476F]/30 text-[#EF476F]">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Your current workspace role does not have permission to view{' '}
          {attempted ? <span className="font-mono text-[#8255FF]">{attempted}</span> : 'this resource'}.
        </p>

        {user && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#2A2E5A] bg-[#111432] px-4 py-2 text-xs text-slate-300">
            <Lock className="h-3.5 w-3.5 text-[#8255FF]" />
            Signed in as <span className="font-semibold text-white">{user.email}</span> ({user.role})
          </div>
        )}

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={homeHref}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] px-5 py-2.5 text-xs font-bold text-white transition"
          >
            <Home className="h-4 w-4" /> Go to My Workspace
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A2E5A] bg-[#111432] hover:bg-[#1E2248] px-5 py-2.5 text-xs font-semibold text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Public Homepage
          </Link>
          {user && (
            <button
              type="button"
              onClick={() => logout()}
              className="w-full sm:w-auto rounded-xl border border-[#EF476F]/30 bg-[#EF476F]/10 hover:bg-[#EF476F]/20 px-4 py-2.5 text-xs font-semibold text-rose-200 transition cursor-pointer"
            >
              Switch Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#15172B] flex items-center justify-center text-slate-300 text-sm">
          Checking permissions...
        </div>
      }
    >
      <AccessDeniedContent />
    </Suspense>
  );
}
