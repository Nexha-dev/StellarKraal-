import React from "react";

interface EmptyStateProps {
  illustration: React.ReactNode;
  message: string;
  ctaLabel: string;
  onCta: () => void;
}

export default function EmptyState({ illustration, message, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div aria-hidden="true" className="mb-4 text-brown/40">
        {illustration}
      </div>
      <p role="status" className="text-brown/70 mb-4 text-sm">
        {message}
      </p>
      <button
        onClick={onCta}
        className="bg-gold text-brown px-5 py-2 rounded-xl font-semibold hover:bg-gold/80 transition focus:outline-none focus:ring-2 focus:ring-gold"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
