import Link from "next/link";
import PageTransition from "@/components/PageTransition";
export default function Home() {
  return (
    <PageTransition>
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--color-text)" }}>🐄 StellarKraal</h1>
      <p className="text-xl mb-2 font-semibold text-gold">Livestock-Backed Micro-Lending on Stellar</p>
      <p className="max-w-sm md:max-w-md mb-10" style={{ color: "var(--color-text-muted)" }}>
        Register your cattle, goats, or sheep as on-chain collateral and access instant micro-loans — built for African emerging markets.
      </p>
      <div className="flex flex-col md:flex-row gap-4 flex-wrap justify-center w-full max-w-sm md:max-w-md">
        <Link
          href="/borrow"
          className="bg-brown text-cream px-6 py-3 rounded-xl font-semibold hover:bg-brown/80 transition min-h-[44px] flex items-center justify-center dark:bg-gold dark:text-brown"
        >
          Get a Loan
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl font-semibold transition min-h-[44px] flex items-center justify-center"
          style={{ border: "2px solid var(--color-text)", color: "var(--color-text)" }}
        >
          Dashboard
        </Link>
        <Link href="/settings" className="px-6 py-3 rounded-xl font-semibold transition" style={{ border: "2px solid var(--color-text)", color: "var(--color-text)" }}>
          Settings
        </Link>
      </div>
    </main>
    </PageTransition>
  );
}
