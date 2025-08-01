import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast-context';
import ProtectedRoute from '@/components/protectedRoute';
import { useReportWebVitals } from 'next/web-vitals';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true
});

export const metadata: Metadata = {
  title: 'Kennametal Dashboard',
  description: 'Admin dashboard for Kennametal products and inventory management',
  viewport: 'width=device-width, initial-scale=1',
  keywords: 'Kennametal, dashboard, admin, products, inventory, management',
  authors: [{ name: 'Kennametal' }],
  robots: 'noindex, nofollow', // Prevent search engines from indexing admin dashboard
  icons: {
    icon: '/favicon.ico', // or '/icon.png' if using PNG
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png', // optional: add apple touch icon
  },
  openGraph: {
    title: 'Kennametal Dashboard',
    description: 'Admin dashboard for Kennametal products',
    type: 'website',
    locale: 'en_US',
  },
};

function MyApp({ Component, pageProps }: any) {
  useReportWebVitals((metric) => {
    // Log to console in development, send to analytics in production
    if (process.env.NODE_ENV === 'development') {
      console.log(metric);
    }
    // Add your analytics service here
  });

  return <Component {...pageProps} />;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <ToastProvider>
          <AuthProvider>
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
