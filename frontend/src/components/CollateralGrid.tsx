"use client";

interface Collateral {
  id: string;
  animal_type: string;
  count: number;
  appraised_value: number;
  createdAt: string;
}

interface Props {
  collaterals: Collateral[];
  loading: boolean;
  onCardClick: (id: string) => void;
}

const ANIMAL_ICONS: Record<string, string> = {
  cattle: "🐄",
  goat: "🐐",
  sheep: "🐑",
};

export default function CollateralGrid({
  collaterals,
  loading,
  onCardClick,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 shadow animate-pulse"
          >
            <div className="h-12 bg-brown/10 rounded mb-4" />
            <div className="h-6 bg-brown/10 rounded mb-3" />
            <div className="h-6 bg-brown/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {collaterals.map((collateral) => {
        const xlmValue = (collateral.appraised_value / 1e7).toFixed(2);
        const usdValue = (parseFloat(xlmValue) * 0.12).toFixed(2);
        const icon = ANIMAL_ICONS[collateral.animal_type] || "🐾";

        return (
          <button
            key={collateral.id}
            onClick={() => onCardClick(collateral.id)}
            className="bg-white rounded-2xl p-6 shadow hover:shadow-lg hover:scale-105 transition-all duration-200 text-left cursor-pointer border border-transparent hover:border-brown/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{icon}</div>
              <span className="bg-brown/10 text-brown text-xs font-semibold px-3 py-1 rounded-full">
                {collateral.count}x
              </span>
            </div>

            <h3 className="text-lg font-semibold text-brown mb-1 capitalize">
              {collateral.animal_type}
            </h3>

            <div className="space-y-3 mt-4 pt-4 border-t border-brown/10">
              <div>
                <p className="text-xs text-brown/60 mb-1">Appraised Value</p>
                <p className="font-semibold text-brown">{xlmValue} XLM</p>
                <p className="text-xs text-brown/50">${usdValue} USD</p>
              </div>

              <div>
                <p className="text-xs text-brown/60 mb-1">Registered</p>
                <p className="text-xs text-brown/70">
                  {new Date(collateral.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-brown/10">
              <p className="text-xs text-brown/50">
                ID: {collateral.id.slice(0, 8)}…
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
