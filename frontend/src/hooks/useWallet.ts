"use client";
import { useState, useEffect } from "react";
import { getAddress, isAllowed, isConnected, setAllowed } from "@/lib/freighterClient";

const STORAGE_KEY = "stellarkraal_wallet";

export type WalletState = {
  address: string | null;
  freighterInstalled: boolean | null; // null = not yet detected
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: detect Freighter and restore persisted address
  useEffect(() => {
    (async () => {
      const installed = await isConnected().then(() => true).catch(() => false);
      setFreighterInstalled(installed);

      if (!installed) return;

      const persisted = localStorage.getItem(STORAGE_KEY);
      if (persisted) {
        // Verify the extension still has permission before restoring
        const allowed = await isAllowed().catch(() => false);
        if (allowed) {
          setAddress(persisted);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    })();
  }, []);

  async function connect() {
    setConnecting(true);
    setError(null);
    try {
      await setAllowed();
      const { address: addr } = await getAddress();
      setAddress(addr);
      localStorage.setItem(STORAGE_KEY, addr);
    } catch (e: any) {
      setError(e.message ?? "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    setAddress(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return { address, freighterInstalled, connecting, error, connect, disconnect };
}
