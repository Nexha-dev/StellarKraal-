"use client";
import { useState } from "react";
import { signTransaction } from "@/lib/freighterClient";
import { submitSignedXdr } from "@/lib/stellarUtils";
import { colors } from "@/lib/design-tokens";

interface Props {
  walletAddress: string;
  initialCollateralId?: string;
}

const ANIMAL_TYPES = ["cattle", "goat", "sheep"];
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function LoanForm({ walletAddress, initialCollateralId }: Props) {
  const [step, setStep] = useState<"collateral" | "loan">(initialCollateralId ? "loan" : "collateral");
  const [animalType, setAnimalType] = useState("cattle");
  const [count, setCount] = useState("");
  const [appraisedValue, setAppraisedValue] = useState("");
  const [collateralId, setCollateralId] = useState(initialCollateralId || "");
  const [loanAmount, setLoanAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function registerCollateral() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/collateral/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: walletAddress,
          animal_type: animalType,
          count: parseInt(count),
          appraised_value: parseInt(appraisedValue),
        }),
      });
      const { xdr } = await res.json();
      const { signedTxXdr } = await signTransaction(xdr, { network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET" });
      const result = await submitSignedXdr(signedTxXdr);
      setStatus(`✅ Collateral registered! ID: ${result}`);
      setStep("loan");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function requestLoan() {
    setLoading(true);
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/loan/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrower: walletAddress,
          collateral_id: parseInt(collateralId),
          amount: parseInt(loanAmount),
        }),
      });
      const { xdr } = await res.json();
      const { signedTxXdr } = await signTransaction(xdr, { network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET" });
      const result = await submitSignedXdr(signedTxXdr);
      setStatus(`✅ Loan disbursed! Loan ID: ${result}`);
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading && step === "collateral") return null;

  return (
    <div className={`${colors.background.card} rounded-2xl p-6 shadow mt-6 space-y-4`}>
      {step === "collateral" ? (
        <>
          <h2 className={`text-xl font-semibold ${colors.text.primary}`}>1. Register Collateral</h2>
          <select
            className={`w-full ${colors.form.input} rounded-lg px-3 py-2 ${colors.text.primary}`}
            value={animalType}
            onChange={(e) => setAnimalType(e.target.value)}
          >
            {ANIMAL_TYPES.map((a) => <option key={a}>{a}</option>)}
          </select>
          <input 
            className={`w-full ${colors.form.input} rounded-lg px-3 py-2 ${colors.text.primary} ${colors.form.placeholder}`} 
            placeholder="Count" 
            value={count} 
            onChange={(e) => setCount(e.target.value)} 
            type="number" 
          />
          <input 
            className={`w-full ${colors.form.input} rounded-lg px-3 py-2 ${colors.text.primary} ${colors.form.placeholder}`} 
            placeholder="Appraised value (stroops)" 
            value={appraisedValue} 
            onChange={(e) => setAppraisedValue(e.target.value)} 
            type="number" 
          />
          <button 
            onClick={registerCollateral} 
            disabled={loading} 
            className={`w-full ${colors.primary.bg} ${colors.primary.text} py-2.5 rounded-xl font-semibold ${colors.primary.hover} transition ${colors.interactive.disabled} ${colors.interactive.focus}`}
          >
            {loading ? "Processing…" : "Register & Continue"}
          </button>
        </>
      ) : (
        <>
          <h2 className={`text-xl font-semibold ${colors.text.primary}`}>2. Request Loan</h2>
          <input 
            className={`w-full ${colors.form.input} rounded-lg px-3 py-2 ${colors.text.primary} ${colors.form.placeholder}`} 
            placeholder="Collateral ID" 
            value={collateralId} 
            onChange={(e) => setCollateralId(e.target.value)} 
            type="number" 
          />
          <input 
            className={`w-full ${colors.form.input} rounded-lg px-3 py-2 ${colors.text.primary} ${colors.form.placeholder}`} 
            placeholder="Loan amount (stroops)" 
            value={loanAmount} 
            onChange={(e) => setLoanAmount(e.target.value)} 
            type="number" 
          />
          <button 
            onClick={requestLoan} 
            disabled={loading} 
            className={`w-full ${colors.secondary.bg} ${colors.secondary.text} py-2.5 rounded-xl font-semibold ${colors.secondary.hover} transition ${colors.interactive.disabled} ${colors.interactive.focus}`}
          >
            {loading ? "Processing…" : "Request Loan"}
          </button>
        </>
      )}
      {status && (
        <p className={`text-sm mt-2 ${status.includes('❌') ? colors.status.error.text : colors.status.success.text}`}>
          {status}
        </p>
      )}
    </div>
  );
}
