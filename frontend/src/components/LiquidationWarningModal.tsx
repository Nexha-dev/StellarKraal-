"use client";

interface Props {
  healthFactor: number; // bps, e.g. 10_000 = 1.0x
  onRepay: () => void;
  onDismiss: () => void;
}

export default function LiquidationWarningModal({ healthFactor, onRepay, onDismiss }: Props) {
  const ratio = (healthFactor / 10_000).toFixed(2);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="liq-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl" aria-hidden="true">⚠️</span>
          <div>
            <h2 id="liq-modal-title" className="text-xl font-bold text-red-700">
              Liquidation Warning
            </h2>
            <p className="text-sm text-brown/70 mt-1">
              Your health factor is <strong className="text-red-600">{ratio}x</strong>, which is
              critically low. If it falls below <strong>1.0x</strong>, your collateral may be
              liquidated.
            </p>
          </div>
        </div>

        <ul className="text-sm text-brown/80 space-y-1 mb-6 list-disc list-inside">
          <li>Repay part of your loan to restore your health factor.</li>
          <li>Add more collateral to increase your buffer.</li>
          <li>Act quickly — liquidation can happen at any time.</li>
        </ul>

        <div className="flex gap-3">
          <button
            onClick={onRepay}
            className="flex-1 bg-gold text-brown font-semibold py-2 rounded-lg hover:bg-gold/80 transition focus:outline-none focus:ring-2 focus:ring-gold"
          >
            Repay Now
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 border border-brown/30 text-brown/70 py-2 rounded-lg hover:bg-brown/5 transition focus:outline-none focus:ring-2 focus:ring-brown/30"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
