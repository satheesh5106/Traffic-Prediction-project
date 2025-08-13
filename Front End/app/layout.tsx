import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ClientAuthProvider from '@/lib/components/ClientAuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TrafficAI - Traffic, Incident & Hazard Prediction Platform',
  description: 'Harness the power of AI to predict traffic patterns, identify potential hazards, and optimize urban mobility before problems occur.',
  keywords: 'traffic prediction, AI, hazard detection, smart cities, urban mobility',
  authors: [{ name: 'TrafficAI Team' }],
  openGraph: {
    title: 'TrafficAI - AI-Powered Traffic Prediction',
    description: 'Revolutionary AI platform for traffic prediction and hazard detection',
    type: 'website',
    url: 'https://trafficai.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrafficAI - AI-Powered Traffic Prediction',
    description: 'Revolutionary AI platform for traffic prediction and hazard detection',
  },
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <ClientAuthProvider>
          {children}
        </ClientAuthProvider>
      </body>
    </html>
  );
}