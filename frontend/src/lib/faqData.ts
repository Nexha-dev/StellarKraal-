export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "wallet",
    label: "Wallet",
    items: [
      { q: "Which wallet do I need to use StellarKraal?", a: "You need the Freighter browser extension. It is free, open-source, and works with Chrome, Firefox, and Brave." },
      { q: "How do I connect my wallet?", a: 'Click "Connect Wallet" on any page. Freighter will ask you to approve the connection. Once approved, your Stellar public key appears in the app.' },
      { q: "Is my private key ever shared with StellarKraal?", a: "No. Freighter signs transactions locally in your browser. StellarKraal never sees your private key." },
      { q: "What network should my wallet be set to?", a: "Use Testnet for testing and Mainnet for real transactions. The app reads NEXT_PUBLIC_NETWORK from its configuration." },
      { q: "Why does my wallet show a different balance than expected?", a: "Balances are fetched from the Stellar network in real time. If you just made a transaction, wait a few seconds and refresh the page." },
      { q: "Can I use multiple wallets?", a: "You can disconnect and reconnect with a different Freighter account. Each wallet address has its own collateral and loan records." },
    ],
  },
  {
    id: "loans",
    label: "Loans",
    items: [
      { q: "How do I apply for a loan?", a: "Go to Borrow, connect your wallet, register your livestock as collateral, then request a loan amount up to the allowed collateral ratio." },
      { q: "What is the maximum loan amount I can request?", a: "The maximum is determined by your collateral's appraised value and the protocol's loan-to-value (LTV) ratio set by the administrator." },
      { q: "How is interest calculated?", a: "Interest accrues on the outstanding principal at the rate configured in the smart contract. The Loan Repayment Calculator shows a breakdown before you repay." },
      { q: "Can I repay a loan partially?", a: "Yes. Enter any amount up to the full outstanding balance in the Repay panel. Partial repayments reduce your principal and improve your health factor." },
      { q: "What happens if I miss a repayment?", a: "There is no fixed repayment schedule, but if your health factor drops below 1.0 due to collateral value changes, your position may be liquidated." },
      { q: "How do I find my Loan ID?", a: 'Your Loan ID is shown after a successful loan request. You can also look it up in the Dashboard\'s "Loan Lookup" panel using your collateral ID.' },
    ],
  },
  {
    id: "collateral",
    label: "Collateral",
    items: [
      { q: "What animals can I register as collateral?", a: "Cattle, goats, and sheep are currently supported." },
      { q: "How is my livestock appraised?", a: "You provide the appraised value when registering. In production, an authorised oracle verifies the value before the collateral is accepted." },
      { q: "Can I register multiple animals in one transaction?", a: "Yes. Set the Count field to the number of animals. They are registered as a single collateral record with a combined appraised value." },
      { q: "Can I update or remove my collateral?", a: "Collateral tied to an active loan cannot be removed. Once the loan is fully repaid, the collateral record can be released." },
      { q: "What is a collateral ID?", a: "A unique on-chain identifier assigned when you register collateral. Keep it safe — you need it to request a loan and to look up your position." },
      { q: "What happens to my collateral if I repay the loan in full?", a: "The collateral is released and your health factor is no longer tracked for that position." },
    ],
  },
  {
    id: "liquidation",
    label: "Liquidation",
    items: [
      { q: "What is liquidation?", a: "If your health factor falls below 1.0, a liquidator can repay part of your loan and claim a portion of your collateral as a reward." },
      { q: "How is the health factor calculated?", a: "Health Factor = (Collateral Value × Liquidation Threshold) ÷ Outstanding Loan. A value above 1.0 means your position is safe." },
      { q: "How do I avoid liquidation?", a: "Monitor your health factor on the Dashboard. If it approaches 1.0, repay part of your loan or add more collateral." },
      { q: "Can I recover my collateral after liquidation?", a: "Only the portion not claimed by the liquidator remains. If the full collateral was seized, it cannot be recovered." },
      { q: "Who can liquidate my position?", a: "Any address can call the liquidation function when your health factor is below 1.0. This is a permissionless mechanism." },
      { q: "Will I be notified before liquidation?", a: "The app shows a warning when your health factor drops below a safe threshold. There is no off-chain notification system yet." },
    ],
  },
  {
    id: "technical",
    label: "Technical",
    items: [
      { q: "Which blockchain does StellarKraal run on?", a: "Stellar, using Soroban smart contracts deployed on Stellar Testnet for testing and Mainnet for production." },
      { q: "Where can I see the smart contract source code?", a: "The contract is in contracts/stellarkraal/src/lib.rs in this repository and is open-source under the MIT licence." },
      { q: "How do I report a bug or security issue?", a: "Open a GitHub issue for bugs. For security vulnerabilities, please follow the responsible disclosure process described in SECURITY.md." },
      { q: "How do I recover a lost transaction?", a: "See docs/recovery/restore-procedure.md for step-by-step recovery instructions." },
      { q: "What does 'stroops' mean?", a: "A stroop is the smallest unit of XLM. 1 XLM = 10,000,000 stroops. Some fields in the app accept stroops directly." },
      { q: "Is there an API I can integrate with?", a: "Yes. The backend exposes a REST API documented in the project README. All endpoints are under /api/v1/." },
    ],
  },
];
