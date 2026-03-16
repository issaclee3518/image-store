import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Image Store",
  description: "간단하고 빠른 사진 저장 웹 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="adsense-init"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9464409337284375"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased bg-white text-zinc-900`}
      >
        <Navbar />
        {children}
        <footer className="mt-auto border-t border-zinc-100 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-zinc-500">
            <Link href="/about" className="hover:text-zinc-700">About</Link>
            <Link href="/privacy" className="hover:text-zinc-700">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-zinc-700">Contact</Link>
            <Link href="/terms" className="hover:text-zinc-700">Terms</Link>
            <Link href="/blog" className="hover:text-zinc-700">Blog</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
