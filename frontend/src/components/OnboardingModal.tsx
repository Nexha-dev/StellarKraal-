"use client";
import { useState, useEffect } from "react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ONBOARDING_STEPS = [
  {
    title: "Connect Your Wallet",
    description: "Connect your Freighter wallet to start using StellarKraal",
    illustration: (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto">
        <rect x="30" y="40" width="60" height="40" rx="8" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="45" cy="55" r="4" fill="currentColor" />
        <circle cx="60" cy="55" r="4" fill="currentColor" />
        <circle cx="75" cy="55" r="4" fill="currentColor" />
        <path d="M40 70 Q60 80 80 70" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    )
  },
  {
    title: "Register Collateral",
    description: "Add your livestock as collateral to secure loans",
    illustration: (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto">
        <ellipse cx="60" cy="66" rx="25" ry="16" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="60" cy="42" r="12" stroke="currentColor" strokeWidth="3" fill="none" />
        <line x1="42" y1="80" x2="40" y2="95" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="52" y1="82" x2="51" y2="95" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="68" y1="82" x2="69" y2="95" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="78" y1="80" x2="80" y2="95" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: "Request a Loan",
    description: "Get instant loans backed by your registered livestock",
    illustration: (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto">
        <rect x="35" y="45" width="50" height="30" rx="6" stroke="currentColor" strokeWidth="3" fill="none" />
        <line x1="45" y1="55" x2="75" y2="55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="45" y1="65" x2="65" y2="65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="75" cy="35" r="8" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
        <path d="M72 35 L75 38 L78 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem("stellarkraal_onboarding_completed", "true");
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem("stellarkraal_onboarding_completed", "true");
    onClose();
  };

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <div className="fixed inset-0 bg-brown-900/80 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-brown-500 hover:text-brown-700 text-xl"
        >
          ×
        </button>
        
        <div className="text-center">
          <div className="mb-6 text-gold-600">
            {step.illustration}
          </div>
          
          <h2 className="text-2xl font-bold text-brown-700 mb-3">
            {step.title}
          </h2>
          
          <p className="text-brown-600 mb-8">
            {step.description}
          </p>
          
          <div className="flex justify-center mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full mx-1 ${
                  index === currentStep ? "bg-gold-600" : "bg-gold-200"
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2 text-brown-600 border border-brown-300 rounded-lg hover:bg-brown-50 transition"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2 bg-brown-600 text-cream-50 rounded-lg hover:bg-brown-700 transition"
            >
              {currentStep === ONBOARDING_STEPS.length - 1 ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
