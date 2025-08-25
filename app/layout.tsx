'use client';

import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import TopBar from '../components/TopBar';
import { Analytics } from "@vercel/analytics/react"

const geist = Geist({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log('RootLayout: Rendering');
  return (
    <html lang="en">
      <body className={geist.className} suppressHydrationWarning={true}>
        <Analytics mode="auto" />
        <AuthProvider>   
          <TopBar />    
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
