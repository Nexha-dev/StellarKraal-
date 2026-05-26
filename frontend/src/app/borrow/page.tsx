"use client";
import { useState } from "react";
import WalletConnect from "@/components/WalletConnect";
import CollateralRegistrationForm from "@/components/CollateralRegistrationForm";
import LoanForm from "@/components/LoanForm";
import PageTransition from "@/components/PageTransition";

export default function Borrow() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [collateralId, setCollateralId] = useState<string | null>(null);

  return (
    <PageTransition>
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-brown mb-6">Borrow</h1>
      <WalletConnect onConnect={setWallet} />
      {wallet && (
        <CollateralRegistrationForm 
          walletAddress={wallet} 
          onSuccess={(id) => setCollateralId(id)}
        />
      )}
      {collateralId && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            Collateral registered with ID: {collateralId}
          </p>
        </div>
      )}
      {wallet && collateralId && (
        <LoanForm walletAddress={wallet} initialCollateralId={collateralId} />
      )}
    </main>
    </PageTransition>
  );
}
