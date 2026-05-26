"use client";
import { useState } from "react";
import { colors } from "@/lib/design-tokens";
import SkeletonCollateralCard from "@/components/SkeletonCollateralCard";

interface Props {
  walletAddress: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function CollateralCard({ walletAddress }: Props) {
  const [collateralId, setCollateralId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/loan/${collateralId}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) return <SkeletonCollateralCard />;

  return (
    <div className={`${colors.background.card} rounded-2xl p-6 shadow mb-4`}>
      <h2 className={`text-xl font-semibold ${colors.text.primary} mb-3`}>Loan Lookup</h2>
      <div className="flex gap-2">
        <input
          className={`${colors.form.input} rounded-lg px-3 py-2 flex-1 ${colors.text.primary} ${colors.form.placeholder}`}
          placeholder="Loan ID"
          value={collateralId}
          onChange={(e) => setCollateralId(e.target.value)}
        />
        <button 
          onClick={lookup} 
          disabled={loading} 
          className={`${colors.primary.bg} ${colors.primary.text} px-4 py-2 rounded-lg ${colors.primary.hover} transition ${colors.interactive.disabled} ${colors.interactive.focus}`}
        >
          {loading ? "…" : "Fetch"}
        </button>
      </div>
      {data && (
        <pre className={`mt-4 ${colors.background.secondary} rounded-lg p-3 text-xs overflow-auto ${colors.text.primary}`}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
