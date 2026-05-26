"use client";
import { healthColor } from "@/lib/design-tokens";
import { colors } from "@/lib/design-tokens";

interface Props {
  value: number; // bps, 10_000 = 1.0
}

export default function HealthGauge({ value }: Props) {
  const ratio = Math.min(value / 20_000, 1); // cap at 200%
  const pct = Math.round(ratio * 100);
  const color = healthColor(value);
  const label = value >= 10_000 ? "Healthy" : "At Risk";

  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold" style={{ color }}>{label}</span>
        <span className={colors.text.secondary}>{(value / 10_000).toFixed(2)}x</span>
      </div>
      <div className="w-full bg-brown-100 rounded-full h-4 overflow-hidden">
        <div
          className="h-4 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
