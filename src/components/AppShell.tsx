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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/forgot-password';
  const isPublicPage = pathname === '/' || pathname.startsWith('/catalog') || pathname.startsWith('/products');
  const isStandaloneModule = pathname?.startsWith('/distribution') || pathname?.startsWith('/field-sales');

  if (isAuthPage || isPublicPage || isStandaloneModule) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] dark:bg-[#0B0D1E] text-slate-900 dark:text-slate-100 antialiased selection:bg-purple-500 selection:text-white">
      {/* Dark Navy Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Workspace Column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Scrollable Workspace Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-7xl animate-in fade-in-50 duration-200">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Drawer */}
      <MobileBottomNav />
    </div>
  );
}
