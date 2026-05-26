"use client";
import { useCurrencyConversion, Currency } from "@/hooks/useCurrencyConversion";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";

interface Props {
  /** Amount in XLM (not stroops) */
  xlm: number;
  className?: string;
}

const SYMBOLS: Record<Currency, string> = {
  KES: "KSh",
  NGN: "₦",
  GHS: "GH₵",
  USD: "$",
};

export default function XlmAmount({ xlm, className = "" }: Props) {
  const { currency, enabled } = useCurrencySettings();
  const { convert, isStale, loading } = useCurrencyConversion();

  const local = enabled ? convert(xlm, currency) : null;

  return (
    <span className={className}>
      {xlm.toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM
      {enabled && (
        <span className="text-brown/60 text-sm ml-1">
          {loading && !local ? (
            "…"
          ) : local !== null ? (
            <>
              ({SYMBOLS[currency]}
              {local.toLocaleString(undefined, { maximumFractionDigits: 2 })})
              {isStale && (
                <span
                  title="Rate may be outdated (>10 min)"
                  className="ml-1 text-amber-500 text-xs"
                >
                  ⚠
                </span>
              )}
            </>
          ) : null}
        </span>
      )}
    </span>
  );
}
