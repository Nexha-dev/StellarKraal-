"use client";
import { Currency } from "@/hooks/useCurrencyConversion";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";

const CURRENCIES: Currency[] = ["KES", "NGN", "GHS", "USD"];

export default function CurrencySettings() {
  const { currency, setCurrency, enabled, setEnabled } = useCurrencySettings();

  return (
    <div className="bg-white rounded-2xl p-6 shadow space-y-4">
      <h2 className="text-xl font-semibold text-brown">Currency Display</h2>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 accent-brown"
        />
        <span className="text-sm">Show local currency equivalent</span>
      </label>

      {enabled && (
        <div>
          <label className="block text-sm font-medium text-brown/70 mb-1">
            Preferred currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="border border-brown/30 rounded-lg px-3 py-2 w-full"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
