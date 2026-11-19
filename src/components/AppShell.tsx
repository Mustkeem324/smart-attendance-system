'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { useAuth } from '@/context/AuthContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/forgot-password';
  const isPublicPage = pathname === '/' || pathname.startsWith('/catalog') || pathname.startsWith('/products');
  const isStandaloneModule = pathname?.startsWith('/distribution') || pathname?.startsWith('/field-sales');

  if (isAuthPage || isPublicPage || isStandaloneModule) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
