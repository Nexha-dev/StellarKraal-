"use client";
import { useWizard } from "@/context/LoanWizardContext";
import { GlossaryTerm } from "@/components/GlossaryTerm";

const TERM_RATES: Record<string, string> = {
  "7": "2%",
  "30": "5%",
  "90": "12%",
  "180": "20%",
};

const ANIMAL_EMOJI: Record<string, string> = {
  cattle: "🐄",
  goat: "🐐",
  sheep: "🐑",
};

export default function StepReview() {
  const { animalType, count, appraisedValue, loanAmount, loanTermDays, nextStep, prevStep } = useWizard();

  const rate = TERM_RATES[loanTermDays] || "5%";
  const rateNum = parseFloat(rate) / 100;
  const fee = Math.floor(parseInt(loanAmount || "0") * rateNum);
  const totalRepay = parseInt(loanAmount || "0") + fee;
  const healthFactor = loanAmount && appraisedValue
    ? (parseInt(appraisedValue) / parseInt(loanAmount) / 1.5).toFixed(2)
    : "—";

  const rows = [
    { label: "Collateral Type", value: `${ANIMAL_EMOJI[animalType]} ${animalType.charAt(0).toUpperCase() + animalType.slice(1)}` },
    { label: "Animal Count", value: count },
    { label: "Appraised Value", value: `${parseInt(appraisedValue).toLocaleString()} stroops` },
    { label: "Loan Amount", value: `${parseInt(loanAmount).toLocaleString()} stroops` },
    { label: "Loan Term", value: `${loanTermDays} days` },
    { label: "Fee Rate", value: rate },
    { label: "Fee Amount", value: `${fee.toLocaleString()} stroops` },
    { label: "Total to Repay", value: `${totalRepay.toLocaleString()} stroops`, bold: true },
    { label: <GlossaryTerm termKey="healthFactor">Health Factor</GlossaryTerm>, value: healthFactor, bold: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brown">Review Loan Terms</h2>
        <p className="text-brown/60 mt-1 text-sm">
          Please review all details carefully before proceeding.
        </p>
      </div>

      <div className="bg-white border border-brown/20 rounded-2xl overflow-hidden">
        {rows.map(({ label, value, bold }, i) => (
          <div
            key={typeof label === "string" ? label : i}
            className={`flex justify-between items-center px-5 py-3.5 ${
              i !== rows.length - 1 ? "border-b border-brown/10" : ""
            } ${bold ? "bg-gold/5" : ""}`}
          >
            <span className={`text-sm ${bold ? "font-semibold text-brown" : "text-brown/60"}`}>{label}</span>
            <span className={`text-sm ${bold ? "font-bold text-brown" : "text-brown"}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Risk warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
        <span className="text-amber-500 text-lg">⚠️</span>
        <p className="text-amber-700 text-sm">
          If the health factor drops below 1.0, your collateral may be liquidated. 
          Monitor your position regularly.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={prevStep}
          className="flex-1 border-2 border-brown/30 text-brown py-3 rounded-xl font-semibold hover:border-brown/60 transition"
        >
          ← Back
        </button>
        <button
          onClick={nextStep}
          className="flex-[2] bg-brown text-cream py-3 rounded-xl font-semibold hover:bg-brown/80 transition"
        >
          Confirm & Submit →
        </button>
      </div>
    </div>
  );
}