"use client";
import { LoanWizardProvider, useWizard } from "@/context/LoanWizardContext";
import StepCollateral from "./steps/StepCollateral";
import StepAmount from "./steps/StepAmount";
import StepReview from "./steps/StepReview";
import StepConfirm from "./steps/StepConfirm";

const STEPS = [
  { number: 1, label: "Collateral" },
  { number: 2, label: "Amount" },
  { number: 3, label: "Review" },
  { number: 4, label: "Confirm" },
];

interface Props {
  walletAddress: string;
}

function WizardInner({ walletAddress }: Props) {
  const { step } = useWizard();

  return (
    <div className="bg-white rounded-2xl shadow-lg mt-6 overflow-hidden">
      {/* Progress Header */}
      <div className="bg-cream border-b border-brown/10 px-6 pt-5 pb-4">
        {/* Step label */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-brown/50">
            Loan Request
          </span>
          <span className="text-xs font-medium text-brown/60">
            Step {step} of {STEPS.length}
          </span>
        </div>

        {/* Step dots / track */}
        <div className="flex items-center gap-0">
          {STEPS.map(({ number, label }, i) => {
            const isCompleted = step > number;
            const isCurrent = step === number;
            return (
              <div key={number} className="flex items-center flex-1 last:flex-none">
                {/* Node */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                      isCompleted
                        ? "bg-brown border-brown text-cream"
                        : isCurrent
                        ? "bg-gold border-gold text-brown"
                        : "bg-white border-brown/25 text-brown/40"
                    }`}
                  >
                    {isCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l4 4 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      number
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1 font-medium transition-colors ${
                      isCurrent ? "text-brown" : isCompleted ? "text-brown/60" : "text-brown/30"
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full overflow-hidden bg-brown/15">
                    <div
                      className="h-full bg-brown transition-all duration-500"
                      style={{ width: step > number ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {step === 1 && <StepCollateral walletAddress={walletAddress} />}
        {step === 2 && <StepAmount />}
        {step === 3 && <StepReview />}
        {step === 4 && <StepConfirm walletAddress={walletAddress} />}
      </div>
    </div>
  );
}

export default function LoanWizard({ walletAddress }: Props) {
  return (
    <LoanWizardProvider>
      <WizardInner walletAddress={walletAddress} />
    </LoanWizardProvider>
  );
}