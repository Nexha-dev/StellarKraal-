"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import WalletConnect from "@/components/WalletConnect";
import CollateralSummary from "@/components/CollateralSummary";
import CollateralGrid from "@/components/CollateralGrid";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Collateral {
  id: string;
  owner: string;
  animal_type: string;
  count: number;
  appraised_value: number;
  createdAt: string;
}

export default function CollateralPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<string | null>(null);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet) {
      fetchCollaterals();
    }
  }, [wallet]);

  async function fetchCollaterals() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/collateral/list?owner=${wallet}`);
      if (!res.ok) throw new Error("Failed to fetch collaterals");
      const data = await res.json();
      setCollaterals(data.collaterals || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCardClick(collateralId: string) {
    router.push(`/dashboard/collateral/${collateralId}`);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-brown mb-6">My Collateral</h1>
      <WalletConnect onConnect={setWallet} />

      {wallet && (
        <>
          {collaterals.length > 0 ? (
            <>
              <CollateralSummary collaterals={collaterals} />
              <CollateralGrid
                collaterals={collaterals}
                loading={loading}
                onCardClick={handleCardClick}
              />
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow text-center">
              <h2 className="text-2xl font-semibold text-brown mb-3">
                No Collateral Registered
              </h2>
              <p className="text-brown/60 mb-6">
                Register livestock as collateral to start borrowing
              </p>
              <button
                onClick={() => router.push("/borrow")}
                className="bg-brown text-cream px-6 py-3 rounded-xl font-semibold hover:bg-brown/80 transition"
              >
                Register Collateral
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}
        </>
      )}
    </main>
  );
}
