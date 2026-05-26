"use client";
import { useState } from "react";
import { useWizard } from "@/context/LoanWizardContext";
import { signTransaction } from "@/lib/freighterClient";
import { submitSignedXdr } from "@/lib/stellarUtils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TERM_RATES: Record<string, string> = {
  "7": "2%",
  "30": "5%",
  "90": "12%",
  "180": "20%",
};

interface Props {
  walletAddress: string;
}

export default function StepConfirm({ walletAddress }: Props) {
  const {
    animalType, count, appraisedValue,
    collateralId, loanAmount, loanTermDays,
    loading, error, setField, prevStep, reset,
  } = useWizard();

  const [loanId, setLoanId] = useState<string | null>(null);

  const rate = TERM_RATES[loanTermDays] || "5%";
  const fee = Math.floor(parseInt(loanAmount || "0") * parseFloat(rate) / 100);
  const totalRepay = parseInt(loanAmount || "0") + fee;

  async function handleSubmit() {
    setField("loading", true);
    setField("error", null);
    try {
      const res = await fetch(`${API}/api/loan/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrower: walletAddress,
          collateral_id: parseInt(collateralId),
          amount: parseInt(loanAmount),
          term_days: parseInt(loanTermDays),
        }),
      });
      if (!res.ok) throw new Error("Loan request failed. Please try again.");
      const { xdr } = await res.json();
      const { signedTxXdr } = await signTransaction(xdr, {
        network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET",
      });
      const result = await submitSignedXdr(signedTxXdr);
      setLoanId(String(result));
    } catch (e: any) {
      setField("error", e.message || "Something went wrong.");
    } finally {
      setField("loading", false);
    }
  }

  if (loanId) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl">
          ✅
        </div>
        <div>
          <h2 className="text-2xl font-bold text-brown">Loan Disbursed!</h2>
          <p className="text-brown/60 mt-2 text-sm">
            Your loan has been approved and disbursed to your wallet.
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-left">
          <p className="text-sm text-green-700 font-medium">Loan ID</p>
          <p className="font-mono text-brown break-all mt-1">{loanId}</p>
        </div>
        <div className="bg-white border border-brown/20 rounded-xl px-5 py-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-brown/60">Amount received</span>
            <span className="font-semibold text-brown">{parseInt(loanAmount).toLocaleString()} stroops</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brown/60">Due in</span>
            <span className="font-semibold text-brown">{loanTermDays} days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brown/60">Total to repay</span>
            <span className="font-bold text-brown">{totalRepay.toLocaleString()} stroops</span>
          </div>
        </div>
        <button
          onClick={reset}
          className="w-full border-2 border-brown/30 text-brown py-3 rounded-xl font-semibold hover:border-brown/60 transition"
        >
          Request Another Loan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brown">Final Summary</h2>
        <p className="text-brown/60 mt-1 text-sm">
          This is your last chance to review before the transaction is signed.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-cream border-2 border-brown/20 rounded-2xl p-5 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-brown/50 uppercase tracking-wider font-medium">You're borrowing</p>
            <p className="text-3xl font-bold text-brown mt-0.5">
              {parseInt(loanAmount).toLocaleString()}
              <span className="text-base font-normal text-brown/50 ml-1">stroops</span>
            </p>
          </div>
          <div className="bg-brown/10 rounded-xl px-3 py-1.5 text-right">
            <p className="text-xs text-brown/50">Collateral</p>
            <p className="text-sm font-semibold text-brown">
              {count} {animalType}(s)
            </p>
          </div>
        </div>

        <div className="border-t border-brown/10 pt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-brown/50">Term</p>
            <p className="font-semibold text-brown">{loanTermDays}d</p>
          </div>
          <div>
            <p className="text-xs text-brown/50">Fee</p>
            <p className="font-semibold text-brown">{fee.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-brown/50">Repay total</p>
            <p className="font-semibold text-brown">{totalRepay.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Wallet note */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <span className="text-blue-500 text-lg">🔐</span>
        <p className="text-blue-700 text-sm">
          Clicking submit will open Freighter to sign the transaction. 
          Make sure your wallet is unlocked.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={prevStep}
          disabled={loading}
          className="flex-1 border-2 border-brown/30 text-brown py-3 rounded-xl font-semibold hover:border-brown/60 transition disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-[2] bg-gold text-brown py-3 rounded-xl font-bold hover:bg-gold/80 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Submitting…
            </>
          ) : (
            "🚀 Submit Loan Request"
          )}
        </button>
      </div>
    </div>
  );
}
