# StellarKraal FAQ

> This file is the source of truth for the in-app FAQ at `/help/faq`.

---

## Wallet

**Q: Which wallet do I need to use StellarKraal?**  
A: You need the [Freighter](https://www.freighter.app/) browser extension. It is free, open-source, and works with Chrome, Firefox, and Brave.

**Q: How do I connect my wallet?**  
A: Click "Connect Wallet" on any page. Freighter will ask you to approve the connection. Once approved, your Stellar public key appears in the app.

**Q: Is my private key ever shared with StellarKraal?**  
A: No. Freighter signs transactions locally in your browser. StellarKraal never sees your private key.

**Q: What network should my wallet be set to?**  
A: Use **Testnet** for testing and **Mainnet** for real transactions. The app reads `NEXT_PUBLIC_NETWORK` from its configuration — check with your administrator if you are unsure.

**Q: Why does my wallet show a different balance than expected?**  
A: Balances are fetched from the Stellar network in real time. If you just made a transaction, wait a few seconds and refresh the page.

**Q: Can I use multiple wallets?**  
A: You can disconnect and reconnect with a different Freighter account. Each wallet address has its own collateral and loan records.

---

## Loans

**Q: How do I apply for a loan?**  
A: Go to **Borrow**, connect your wallet, register your livestock as collateral, then request a loan amount up to the allowed collateral ratio.

**Q: What is the maximum loan amount I can request?**  
A: The maximum is determined by your collateral's appraised value and the protocol's loan-to-value (LTV) ratio set by the administrator.

**Q: How is interest calculated?**  
A: Interest accrues on the outstanding principal at the rate configured in the smart contract. The Loan Repayment Calculator on the Dashboard shows a breakdown before you repay.

**Q: Can I repay a loan partially?**  
A: Yes. Enter any amount up to the full outstanding balance in the Repay panel. Partial repayments reduce your principal and improve your health factor.

**Q: What happens if I miss a repayment?**  
A: There is no fixed repayment schedule, but if your health factor drops below 1.0 due to collateral value changes, your position may be liquidated.

**Q: How do I find my Loan ID?**  
A: Your Loan ID is shown after a successful loan request. You can also look it up in the Dashboard's "Loan Lookup" panel using your collateral ID.

---

## Collateral

**Q: What animals can I register as collateral?**  
A: Cattle, goats, and sheep are currently supported.

**Q: How is my livestock appraised?**  
A: You provide the appraised value when registering. In production, an authorised oracle verifies the value before the collateral is accepted.

**Q: Can I register multiple animals in one transaction?**  
A: Yes. Set the **Count** field to the number of animals. They are registered as a single collateral record with a combined appraised value.

**Q: Can I update or remove my collateral?**  
A: Collateral tied to an active loan cannot be removed. Once the loan is fully repaid, the collateral record can be released.

**Q: What is a collateral ID?**  
A: A unique on-chain identifier assigned when you register collateral. Keep it safe — you need it to request a loan and to look up your position.

**Q: What happens to my collateral if I repay the loan in full?**  
A: The collateral is released and your health factor is no longer tracked for that position.

---

## Liquidation

**Q: What is liquidation?**  
A: If your health factor falls below 1.0, a liquidator can repay part of your loan and claim a portion of your collateral as a reward. This protects the protocol from bad debt.

**Q: How is the health factor calculated?**  
A: Health Factor = (Collateral Value × Liquidation Threshold) ÷ Outstanding Loan. A value above 1.0 means your position is safe.

**Q: How do I avoid liquidation?**  
A: Monitor your health factor on the Dashboard. If it approaches 1.0, repay part of your loan or add more collateral.

**Q: Can I recover my collateral after liquidation?**  
A: Only the portion not claimed by the liquidator remains. If the full collateral was seized, it cannot be recovered.

**Q: Who can liquidate my position?**  
A: Any address can call the liquidation function when your health factor is below 1.0. This is a permissionless mechanism.

**Q: Will I be notified before liquidation?**  
A: The app shows a warning when your health factor drops below a safe threshold. There is no off-chain notification system yet.

---

## Technical

**Q: Which blockchain does StellarKraal run on?**  
A: Stellar, using Soroban smart contracts. The contract is deployed on Stellar Testnet for testing and Mainnet for production.

**Q: Where can I see the smart contract source code?**  
A: The contract is in `contracts/stellarkraal/src/lib.rs` in this repository and is open-source under the MIT licence.

**Q: How do I report a bug or security issue?**  
A: Open a GitHub issue for bugs. For security vulnerabilities, please follow the responsible disclosure process described in `SECURITY.md`.

**Q: How do I recover a lost transaction?**  
A: See `docs/recovery/restore-procedure.md` for step-by-step recovery instructions.

**Q: What does "stroops" mean?**  
A: A stroop is the smallest unit of XLM. 1 XLM = 10,000,000 stroops. Some fields in the app accept stroops directly.

**Q: Is there an API I can integrate with?**  
A: Yes. The backend exposes a REST API documented in the project README. All endpoints are under `/api/v1/`.
