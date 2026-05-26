"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import WalletConnect from "@/components/WalletConnect";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Collateral {
  id: string;
  owner: string;
  animal_type: string;
  count: number;
  appraised_value: number;
  createdAt: string;
}

interface Loan {
  id: string;
  borrower: string;
  collateral_id: string;
  amount: number;
  createdAt: string;
}

const ANIMAL_ICONS: Record<string, string> = {
  cattle: "🐄",
  goat: "🐐",
  sheep: "🐑",
};

export default function CollateralDetailPage() {
  const router = useRouter();
  const params = useParams();
  const collateralId = params.id as string;

  const [wallet, setWallet] = useState<string | null>(null);
  const [collateral, setCollateral] = useState<Collateral | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet && collateralId) {
      fetchDetails();
    }
  }, [wallet, collateralId]);

  async function fetchDetails() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/api/collateral/${collateralId}?owner=${wallet}`
      );
      if (!res.ok) throw new Error("Failed to fetch collateral details");
      const data = await res.json();
      setCollateral(data.collateral);
      setLoans(data.loans || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!wallet) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-brown mb-6">Collateral Details</h1>
        <WalletConnect onConnect={setWallet} />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-brown/10 rounded" />
          <div className="h-64 bg-brown/10 rounded" />
        </div>
      </main>
    );
  }

  if (error || !collateral) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <button
          onClick={() => router.back()}
          className="text-brown hover:text-brown/70 mb-6 font-semibold"
        >
          ← Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error || "Collateral not found"}
        </div>
      </main>
    );
  }

  const xlmValue = (collateral.appraised_value / 1e7).toFixed(2);
  const usdValue = (parseFloat(xlmValue) * 0.12).toFixed(2);
  const icon = ANIMAL_ICONS[collateral.animal_type] || "🐾";

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <button
        onClick={() => router.back()}
        className="text-brown hover:text-brown/70 mb-6 font-semibold"
      >
        ← Back to Collateral
      </button>

      <div className="bg-white rounded-2xl p-8 shadow mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-6xl mb-4">{icon}</div>
            <h1 className="text-3xl font-bold text-brown capitalize">
              {collateral.animal_type}
            </h1>
          </div>
          <span className="bg-brown/10 text-brown text-lg font-semibold px-4 py-2 rounded-full">
            {collateral.count}x
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-brown/10">
          <div>
            <p className="text-brown/60 text-sm mb-2">Appraised Value</p>
            <p className="text-2xl font-bold text-brown">{xlmValue} XLM</p>
            <p className="text-sm text-brown/50">${usdValue} USD</p>
          </div>

          <div>
            <p className="text-brown/60 text-sm mb-2">Registered Date</p>
            <p className="text-lg font-semibold text-brown">
              {new Date(collateral.createdAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-brown/50">
              {new Date(collateral.createdAt).toLocaleTimeString()}
            </p>
          </div>

          <div>
            <p className="text-brown/60 text-sm mb-2">Collateral ID</p>
            <p className="font-mono text-sm text-brown break-all">
              {collateral.id}
            </p>
          </div>

          <div>
            <p className="text-brown/60 text-sm mb-2">Owner Address</p>
            <p className="font-mono text-sm text-brown break-all">
              {collateral.owner.slice(0, 8)}…{collateral.owner.slice(-6)}
            </p>
          </div>
        </div>
      </div>

      {loans.length > 0 && (
        <div className="bg-white rounded-2xl p-8 shadow">
          <h2 className="text-xl font-semibold text-brown mb-4">
            Associated Loans
          </h2>
          <div className="space-y-3">
            {loans.map((loan) => {
              const loanXlm = (loan.amount / 1e7).toFixed(2);
              const loanUsd = (parseFloat(loanXlm) * 0.12).toFixed(2);
              return (
                <div
                  key={loan.id}
                  className="border border-brown/10 rounded-lg p-4 hover:bg-brown/5 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-brown">Loan #{loan.id}</p>
                    <span className="text-sm text-brown/60">
                      {new Date(loan.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-brown">
                    {loanXlm} XLM <span className="text-sm text-brown/50">(${loanUsd})</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loans.length === 0 && (
        <div className="bg-cream rounded-2xl p-8 text-center border border-brown/10">
          <p className="text-brown/60 mb-4">No loans associated with this collateral</p>
          <button
            onClick={() => router.push("/borrow")}
            className="bg-brown text-cream px-6 py-2 rounded-lg font-semibold hover:bg-brown/80 transition"
          >
            Request a Loan
          </button>
        </div>
      )}
    </main>
  );
}
