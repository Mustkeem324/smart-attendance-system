import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Apex Mobile & Electronics Distribution Ltd. | B2B Smartphone & Hardware Supply',
  description:
    'Premier B2B technology distributor connecting leading smartphone brands, wireless audio, GaN chargers, and mobile accessories with authorized retail dealer networks.',
  keywords: [
    'mobile distribution',
    'smartphone wholesale',
    'electronics distributor',
    'B2B mobile phones',
    'retailer dealer network',
    'genuine IMEI tracking',
    'GST tax invoices',
  ],
  openGraph: {
    title: 'Apex Mobile & Electronics Distribution Ltd.',
    description:
      'Powering the Future of Mobile & Electronics Distribution. Connecting leading technology brands with retailers through reliable distribution and genuine products.',
    type: 'website',
    locale: 'en_IN',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem('theme');var dark=stored?stored==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-full bg-[var(--background)] font-sans text-[var(--foreground)] antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
