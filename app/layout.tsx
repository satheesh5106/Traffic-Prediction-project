import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { EnhancedAuthProvider } from "@/contexts/EnhancedAuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Traffic Prediction AI",
  description: "Advanced traffic prediction and route optimization system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <EnhancedAuthProvider>
            {children}
          </EnhancedAuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}