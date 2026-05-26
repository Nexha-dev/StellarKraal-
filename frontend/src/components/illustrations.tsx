/** Empty loans list illustration */
export function EmptyLoansIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="10" y="20" width="60" height="40" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <line x1="20" y1="33" x2="60" y2="33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="43" x2="50" y2="43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="53" x2="40" y2="53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="55" r="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
      <line x1="57" y1="55" x2="63" y2="55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Empty collateral list illustration */
export function EmptyCollateralIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {/* Simple cow silhouette */}
      <ellipse cx="40" cy="46" rx="22" ry="14" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="40" cy="28" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <line x1="28" y1="58" x2="26" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="60" x2="35" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="44" y1="60" x2="45" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="52" y1="58" x2="54" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Empty transaction history illustration */
export function EmptyTransactionsIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="15" y="15" width="50" height="50" rx="8" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path d="M28 40 L36 48 L52 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      <line x1="28" y1="40" x2="52" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
    </svg>
  );
}
