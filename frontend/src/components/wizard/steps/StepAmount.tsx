"use client";
import { useWizard } from "@/context/LoanWizardContext";
import { GlossaryTerm } from "@/components/GlossaryTerm";

const TERM_OPTIONS = [
  { days: "7", label: "7 days", rate: "2%" },
  { days: "30", label: "30 days", rate: "5%" },
  { days: "90", label: "90 days", rate: "12%" },
  { days: "180", label: "180 days", rate: "20%" },
];

export default function StepAmount() {
  const {
    loanAmount, loanTermDays, appraisedValue,
    error, setField, nextStep, prevStep,
  } = useWizard();

  const maxLoan = appraisedValue ? Math.floor(parseInt(appraisedValue) * 0.7) : 0; // 70% LTV
  const ltv = loanAmount && maxLoan ? ((parseInt(loanAmount) / maxLoan) * 70).toFixed(1) : "0";
  const healthFactor = loanAmount && appraisedValue
    ? (parseInt(appraisedValue) / parseInt(loanAmount) / 1.5).toFixed(2)
    : null;

  function validate(): string | null {
    if (!loanAmount || parseInt(loanAmount) < 1) return "Please enter a loan amount.";
    if (parseInt(loanAmount) > maxLoan) return `Loan amount cannot exceed ${maxLoan.toLocaleString()} stroops (70% LTV).`;
    return null;
  }

  function handleNext() {
    const err = validate();
    if (err) { setField("error", err); return; }
    setField("error", null);
    nextStep();
  }

  const healthColor =
    !healthFactor ? "text-brown/40"
    : parseFloat(healthFactor) >= 1.5 ? "text-green-600"
    : parseFloat(healthFactor) >= 1.0 ? "text-yellow-600"
    : "text-red-600";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brown">Choose Loan Amount</h2>
        <p className="text-brown/60 mt-1 text-sm">
          Maximum loan is 70% of your collateral value.
        </p>
      </div>

      {/* Max loan info */}
      <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 flex justify-between items-center">
        <span className="text-sm text-brown/70">Available to borrow</span>
        <span className="font-bold text-brown text-lg">
          {maxLoan.toLocaleString()} <span className="text-sm font-normal text-brown/50">stroops</span>
        </span>
      </div>

      {/* Amount input */}
      <div>
        <label className="block text-sm font-medium text-brown mb-1">Loan Amount (stroops)</label>
        <div className="relative">
          <input
            type="number"
            min="1"
            max={maxLoan}
            placeholder="e.g. 5000000"
            value={loanAmount}
            onChange={(e) => setField("loanAmount", e.target.value)}
            className="w-full border border-brown/30 rounded-xl px-4 py-3 pr-16 text-brown placeholder-brown/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brown/40 text-sm">XLM</span>
        </div>

        {/* LTV slider indicator */}
        {loanAmount && maxLoan > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-brown/50 mb-1">
              <span><GlossaryTerm termKey="ltv">LTV</GlossaryTerm>: {ltv}%</span>
              <span>Max: 70%</span>
            </div>
            <div className="h-2 bg-brown/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  parseFloat(ltv) > 65 ? "bg-red-500" : parseFloat(ltv) > 50 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${Math.min(parseFloat(ltv), 70) / 70 * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Loan term */}
      <div>
        <label className="block text-sm font-medium text-brown mb-2">Loan Term</label>
        <div className="grid grid-cols-4 gap-2">
          {TERM_OPTIONS.map(({ days, label, rate }) => (
            <button
              key={days}
              onClick={() => setField("loanTermDays", days)}
              className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                loanTermDays === days
                  ? "border-gold bg-gold/10"
                  : "border-brown/20 hover:border-brown/40 bg-white"
              }`}
            >
              <span className="font-semibold text-brown text-sm">{label}</span>
              <span className="text-brown/50 text-xs">{rate} fee</span>
            </button>
          ))}
        </div>
      </div>

      {/* Health factor preview */}
      {healthFactor && (
        <div className="bg-white border border-brown/20 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-brown/70"><GlossaryTerm termKey="healthFactor">Est. Health Factor</GlossaryTerm></span>
          <span className={`font-bold text-lg ${healthColor}`}>{healthFactor}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={prevStep}
          className="flex-1 border-2 border-brown/30 text-brown py-3 rounded-xl font-semibold hover:border-brown/60 transition"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="flex-[2] bg-brown text-cream py-3 rounded-xl font-semibold hover:bg-brown/80 transition"
        >
          Review Terms →
        </button>
      </div>
    </div>
  );
}