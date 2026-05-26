"use client";
import { useWallet } from "@/hooks/useWallet";

export default function WalletHeader() {
  const { address, freighterInstalled, connecting, connect, disconnect } = useWallet();

  return (
    <header className="bg-brown text-cream px-6 py-3 flex items-center justify-between">
      <span className="font-bold tracking-wide">🐄 StellarKraal</span>
      <div className="text-sm">
        {address ? (
          <span className="flex items-center gap-3">
            <span className="font-mono bg-brown/40 px-3 py-1 rounded-lg">
              {address.slice(0, 8)}…{address.slice(-6)}
            </span>
            <button
              onClick={disconnect}
              className="text-cream/70 hover:text-cream transition"
            >
              Disconnect
            </button>
          </span>
        ) : freighterInstalled === false ? (
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold underline hover:text-gold/80"
          >
            Install Freighter
          </a>
        ) : (
          <button
            onClick={connect}
            disabled={connecting || freighterInstalled === null}
            className="bg-gold text-brown font-semibold px-4 py-1.5 rounded-lg hover:bg-gold/80 transition disabled:opacity-50"
          >
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
