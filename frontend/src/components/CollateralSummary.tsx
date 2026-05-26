"use client";

interface Collateral {
  appraised_value: number;
}

interface Props {
  collaterals: Collateral[];
}

export default function CollateralSummary({ collaterals }: Props) {
  const totalValue = collaterals.reduce((sum, c) => sum + c.appraised_value, 0);
  const xlmValue = (totalValue / 1e7).toFixed(2);
  // Assuming 1 XLM ≈ $0.12 (placeholder, should be fetched from oracle)
  const usdValue = (parseFloat(xlmValue) * 0.12).toFixed(2);
  // Available capacity: typically 50% of collateral value
  const availableCapacity = (totalValue * 0.5 / 1e7).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-gradient-to-br from-brown/5 to-brown/10 rounded-2xl p-6 border border-brown/20">
        <p className="text-brown/60 text-sm font-medium mb-2">Total Collateral Value</p>
        <p className="text-2xl font-bold text-brown mb-1">{xlmValue} XLM</p>
        <p className="text-sm text-brown/50">${usdValue} USD</p>
      </div>

      <div className="bg-gradient-to-br from-gold/5 to-gold/10 rounded-2xl p-6 border border-gold/20">
        <p className="text-brown/60 text-sm font-medium mb-2">Available Borrowing Capacity</p>
        <p className="text-2xl font-bold text-brown mb-1">{availableCapacity} XLM</p>
        <p className="text-sm text-brown/50">50% of collateral value</p>
      </div>

      <div className="bg-gradient-to-br from-cream to-cream/50 rounded-2xl p-6 border border-brown/10">
        <p className="text-brown/60 text-sm font-medium mb-2">Assets Registered</p>
        <p className="text-2xl font-bold text-brown">{collaterals.length}</p>
        <p className="text-sm text-brown/50">livestock items</p>
      </div>
    </div>
  );
}
