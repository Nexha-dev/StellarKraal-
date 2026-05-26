"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type AnimalType = "cattle" | "goat" | "sheep";

export interface WizardState {
  // Step 1 – Collateral
  animalType: AnimalType;
  count: string;
  appraisedValue: string;
  collateralId: string; // returned after register

  // Step 2 – Amount
  loanAmount: string;
  loanTermDays: string;

  // Meta
  step: number;
  loading: boolean;
  error: string | null;
}

interface WizardCtx extends WizardState {
  setField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

const defaults: WizardState = {
  animalType: "cattle",
  count: "",
  appraisedValue: "",
  collateralId: "",
  loanAmount: "",
  loanTermDays: "30",
  step: 1,
  loading: false,
  error: null,
};

const LoanWizardContext = createContext<WizardCtx | null>(null);

export function LoanWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(defaults);

  function setField<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function nextStep() {
    setState((s) => ({ ...s, step: Math.min(s.step + 1, 4), error: null }));
  }

  function prevStep() {
    setState((s) => ({ ...s, step: Math.max(s.step - 1, 1), error: null }));
  }

  function reset() {
    setState(defaults);
  }

  return (
    <LoanWizardContext.Provider value={{ ...state, setField, nextStep, prevStep, reset }}>
      {children}
    </LoanWizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(LoanWizardContext);
  if (!ctx) throw new Error("useWizard must be used inside LoanWizardProvider");
  return ctx;
}