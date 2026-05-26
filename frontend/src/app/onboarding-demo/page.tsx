"use client";

import { useState } from "react";
import OnboardingModal from "@/components/OnboardingModal";
import HelpMenu from "@/components/HelpMenu";
import { useOnboarding } from "@/hooks/useOnboarding";

export default function OnboardingDemo() {
  const { showOnboarding, openOnboarding, closeOnboarding } = useOnboarding();
  const [resetTick, setResetTick] = useState(0);

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-brown-700">StellarKraal Onboarding Demo</h1>
          <HelpMenu onShowOnboarding={openOnboarding} />
        </div>

        <div className="rounded-2xl bg-cream-50 p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-brown-700">Demo Features</h2>
          <ul className="space-y-2 text-brown-600">
            <li>3-step onboarding modal with illustrations</li>
            <li>Skip and dismiss functionality on every step</li>
            <li>Completion state persisted in localStorage</li>
            <li>Help menu to re-access onboarding</li>
            <li>Responsive design with StellarKraal branding</li>
          </ul>

          <div className="mt-6">
            <button
              onClick={openOnboarding}
              className="rounded-lg bg-brown-600 px-4 py-2 text-cream-50 transition hover:bg-brown-700"
            >
              Show Onboarding
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("stellarkraal_onboarding_completed");
                setResetTick((value) => value + 1);
              }}
              className="ml-3 rounded-lg bg-gold-600 px-4 py-2 text-cream-50 transition hover:bg-gold-700"
            >
              Reset Demo
            </button>
            <span className="sr-only">{resetTick}</span>
          </div>
        </div>

        <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} />
      </div>
    </div>
  );
}
