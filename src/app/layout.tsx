import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
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
  description: 'Admin dashboard for Kennametal products',
  viewport: 'width=device-width, initial-scale=1',
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
        <AuthProvider>
          <ProtectedRoute>
            {children}
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}
