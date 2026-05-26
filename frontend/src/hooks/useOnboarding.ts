import { useState, useEffect } from "react";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("stellarkraal_onboarding_completed");
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const openOnboarding = () => setShowOnboarding(true);
  const closeOnboarding = () => setShowOnboarding(false);

  return {
    showOnboarding,
    openOnboarding,
    closeOnboarding
  };
}
