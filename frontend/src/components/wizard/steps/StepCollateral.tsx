"use client";
import { useWizard, AnimalType } from "@/context/LoanWizardContext";
import { signTransaction } from "@/lib/freighterClient";
import { submitSignedXdr } from "@/lib/stellarUtils";

const ANIMAL_TYPES: { value: AnimalType; label: string; emoji: string; desc: string }[] = [
  { value: "cattle", label: "Cattle", emoji: "🐄", desc: "High appraisal value" },
  { value: "goat", label: "Goat", emoji: "🐐", desc: "Medium liquidity" },
  { value: "sheep", label: "Sheep", emoji: "🐑", desc: "Stable collateral" },
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Props {
  walletAddress: string;
}

export default function StepCollateral({ walletAddress }: Props) {
  const { animalType, count, appraisedValue, loading, error, setField, nextStep } = useWizard();

  function validate(): string | null {
    if (!count || parseInt(count) < 1) return "Please enter at least 1 animal.";
    if (!appraisedValue || parseInt(appraisedValue) < 1) return "Please enter a valid appraised value.";
    return null;
  }

  async function handleRegister() {
    const err = validate();
    if (err) { setField("error", err); return; }

    setField("loading", true);
    setField("error", null);
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
      if (!res.ok) throw new Error("Registration failed. Please try again.");
      const { xdr } = await res.json();
      const { signedTxXdr } = await signTransaction(xdr, {
        network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET",
      });
      const collateralId = await submitSignedXdr(signedTxXdr);
      setField("collateralId", String(collateralId));
      nextStep();
    } catch (e: any) {
      setField("error", e.message || "Something went wrong.");
    } finally {
      setField("loading", false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brown">Select Your Collateral</h2>
        <p className="text-brown/60 mt-1 text-sm">
          Choose the livestock type you want to register as on-chain collateral.
        </p>
      </div>

      {/* Animal type picker */}
      <div className="grid grid-cols-3 gap-3">
        {ANIMAL_TYPES.map(({ value, label, emoji, desc }) => (
          <button
            key={value}
            onClick={() => setField("animalType", value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
              animalType === value
                ? "border-gold bg-gold/10 shadow-md"
                : "border-brown/20 hover:border-brown/40 bg-white"
            }`}
          >
            <span className="text-3xl">{emoji}</span>
            <span className="font-semibold text-brown text-sm">{label}</span>
            <span className="text-brown/50 text-xs text-center">{desc}</span>
          </button>
        ))}
      </div>

      {/* Count */}
      <div>
        <label className="block text-sm font-medium text-brown mb-1">
          Number of Animals
        </label>
        <input
          type="number"
          min="1"
          placeholder="e.g. 5"
          value={count}
          onChange={(e) => setField("count", e.target.value)}
          className="w-full border border-brown/30 rounded-xl px-4 py-3 text-brown placeholder-brown/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
        />
      </div>

      {/* Appraised value */}
      <div>
        <label className="block text-sm font-medium text-brown mb-1">
          Total Appraised Value <span className="text-brown/50 font-normal">(in stroops)</span>
        </label>
        <div className="relative">
          <input
            type="number"
            min="1"
            placeholder="e.g. 10000000"
            value={appraisedValue}
            onChange={(e) => setField("appraisedValue", e.target.value)}
            className="w-full border border-brown/30 rounded-xl px-4 py-3 pr-16 text-brown placeholder-brown/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brown/40 text-sm font-medium">
            XLM
          </span>
        </div>
        {count && appraisedValue && (
          <p className="text-xs text-brown/50 mt-1">
            ≈ {(parseInt(appraisedValue) / parseInt(count) / 10_000_000).toFixed(2)} XLM per head
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full bg-brown text-cream py-3 rounded-xl font-semibold hover:bg-brown/80 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Registering on-chain…
          </>
        ) : (
          "Register & Continue →"
        )}
      </button>
    </div>
  );
}
