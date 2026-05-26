import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import OfflineBanner from "@/components/OfflineBanner";
import Navbar from "@/components/Navbar";
export const metadata: Metadata = {
  title: "StellarKraal — Livestock Micro-Lending",
  description: "Livestock-backed micro-lending on Stellar/Soroban",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream text-brown min-h-screen overflow-x-hidden px-4">
        <OfflineBanner />
        <nav className="flex gap-4 px-6 py-3 text-sm border-b border-brown/10">
          <Link href="/" className="font-semibold text-brown hover:text-brown/70">StellarKraal</Link>
          <span className="flex-1" />
          <Link href="/loans" className="text-brown/70 hover:text-brown">Loans</Link>
          <Link href="/collateral" className="text-brown/70 hover:text-brown">Collateral</Link>
          <Link href="/help/faq" className="text-brown/70 hover:text-brown">FAQ</Link>
          <Link href="/settings" className="text-brown/70 hover:text-brown">Settings</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
