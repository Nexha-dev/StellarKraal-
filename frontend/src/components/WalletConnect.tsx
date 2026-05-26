"use client";
import { useEffect } from "react";
import { colors } from "@/lib/design-tokens";
import { useWallet } from "@/hooks/useWallet";

interface Props {
  onConnect: (address: string) => void;
}

export default function WalletConnect({ onConnect }: Props) {
  const { address, freighterInstalled, connecting, error, connect } = useWallet();

  // Notify parent whenever address changes
  useEffect(() => {
    if (address) onConnect(address);
  }, [address, onConnect]);

  // Still detecting
  if (freighterInstalled === null) return null;

  // Not installed
  if (!freighterInstalled) {
    return (
      <div className="mb-6 rounded-xl border border-brown/30 bg-cream px-4 py-3 text-sm">
        <p className="font-semibold text-brown mb-1">Freighter wallet not detected</p>
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold underline hover:text-gold/80"
        >
          Install Freighter →
        </a>
      </div>
    );
  }

  // Connected
  if (address) {
    return (
      <div className={`${colors.status.success.bg} rounded-xl px-4 py-3 mb-6 text-sm font-mono ${colors.status.success.text}`}>
        ✅ {address.slice(0, 8)}…{address.slice(-6)}
      </div>
    );
  }

  // Ready to connect
  return (
    <div className="mb-6">
      <button
        onClick={connect}
        className={`${colors.primary.bg} ${colors.primary.text} px-5 py-2.5 rounded-xl font-semibold ${colors.primary.hover} transition ${colors.interactive.focus}`}
      >
        {connecting ? "Connecting…" : "Connect Freighter Wallet"}
      </button>
      {error && <p className={`${colors.status.error.text} text-sm mt-2`}>{error}</p>}
    </div>
  );
}
