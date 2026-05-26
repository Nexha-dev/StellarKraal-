"use client";
import { useState } from "react";
import { signTransaction } from "@/lib/freighterClient";
import { submitSignedXdr } from "@/lib/stellarUtils";
import { colors } from "@/lib/design-tokens";

interface Props {
  walletAddress: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function RepayPanel({ walletAddress }: Props) {
  const [loanId, setLoanId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function repay() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/loan/repay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrower: walletAddress, loan_id: parseInt(loanId), amount: parseInt(amount) }),
      });
      const { xdr } = await res.json();
      const { signedTxXdr } = await signTransaction(xdr, { network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET" });
      await submitSignedXdr(signedTxXdr);
      setStatus("✅ Repayment submitted!");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${colors.background.card} rounded-2xl p-6 shadow mb-4`}>
      <h2 className={`text-xl font-semibold ${colors.text.primary} mb-3`}>Repay Loan</h2>
      <div className="space-y-3">
        <input 
          className={`w-full ${colors.form.input} rounded-lg px-3 py-2 ${colors.text.primary} ${colors.form.placeholder}`} 
          placeholder="Loan ID" 
          value={loanId} 
          onChange={(e) => setLoanId(e.target.value)} 
          type="number" 
        />
        <input 
          className={`w-full ${colors.form.input} rounded-lg px-3 py-2 ${colors.text.primary} ${colors.form.placeholder}`} 
          placeholder="Amount (stroops)" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          type="number" 
        />
        <button 
          onClick={repay} 
          disabled={loading} 
          className={`w-full ${colors.secondary.bg} ${colors.secondary.text} py-2.5 rounded-xl font-semibold ${colors.secondary.hover} transition ${colors.interactive.disabled} ${colors.interactive.focus}`}
        >
          {loading ? "Processing…" : "Repay"}
        </button>
      </div>
      {status && (
        <p className={`text-sm mt-2 ${status.includes('❌') ? colors.status.error.text : colors.status.success.text}`}>
          {status}
        </p>
      )}
    </div>
  );
}
