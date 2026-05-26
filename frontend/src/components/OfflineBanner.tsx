"use client";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 bg-brown text-cream text-center py-2 text-sm font-semibold"
    >
      You are offline. Some features may be unavailable.
    </div>
  );
}
