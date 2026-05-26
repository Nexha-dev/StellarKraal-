# Implementation Plan: Loan Request Wizard

## Overview

Incrementally replace the existing `LoanForm` component on `/borrow` with a 4-step guided wizard backed by a Zustand store. Each task builds on the previous, ending with full integration into the borrow page.

## Tasks

- [ ] 1. Install dependencies and set up wizard directory structure
  - Add `zustand` to `frontend/package.json` if not already present
  - Add `fast-check` as a dev dependency for property-based tests
  - Create `frontend/src/store/` directory and `frontend/src/components/wizard/steps/` directory
  - _Requirements: 8.1_

- [ ] 2. Implement the WizardStore (Zustand)
  - [ ] 2.1 Create `frontend/src/store/loanWizardStore.ts`
    - Define `AnimalType`, `CollateralFields`, `LoanFields`, `RepaymentPreview`, `WizardState`, `WizardActions` types
    - Implement Zustand store with `nextStep`, `prevStep`, `setCollateralField`, `setLoanField`, `setRepaymentPreview`, `setStepError`, `clearStepError`, `setSubmitting`, `setSuccessLoanId`, `reset` actions
    - Initial state: `currentStep: 1`, all string fields `""`, `repaymentPreview: null`, `stepErrors: {}`, `submitting: false`, `successLoanId: null`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 2.2 Write property tests for WizardStore
    - **Property 2: Back navigation preserves all field values** — for any field values at step N > 1, `prevStep()` decrements step and leaves all fields unchanged
    - **Property 6: Store reset returns to exact initial state** — for any wizard state, `reset()` returns store to initial values
    - **Property 8: Step errors are step-scoped** — `setStepError(step, msg)` only mutates `stepErrors[step]`
    - Tag: `// Feature: loan-request-wizard, Property 2/6/8`
    - _Requirements: 6.1, 6.2, 6.3, 5.6, 8.4_

  - [-] 2.3 Write unit tests for WizardStore
    - Test `nextStep` increments step from 1→2, 2→3, 3→4, stays at 4
    - Test `prevStep` decrements step from 4→3, 3→2, 2→1, stays at 1
    - Test `setCollateralField` and `setLoanField` update correct fields
    - Test `reset` returns exact initial state
    - _Requirements: 8.2, 8.3_

- [ ] 3. Checkpoint — store tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement ProgressIndicator component
  - [ ] 4.1 Create `frontend/src/components/wizard/ProgressIndicator.tsx`
    - Props: `{ currentStep: number; totalSteps: number }`
    - Render horizontal step track with 4 nodes: completed (brown fill + checkmark), active (gold fill + bold), upcoming (outlined + muted)
    - Render "Step N of 4" text label below the track
    - _Requirements: 1.2, 7.1, 7.2, 7.3, 7.4_

  - [ ] 4.2 Write property tests for ProgressIndicator
    - **Property 7: ProgressIndicator label matches store step** — for any `currentStep` in {1,2,3,4}, rendered text contains "Step N of 4" where N = currentStep
    - Tag: `// Feature: loan-request-wizard, Property 7`
    - _Requirements: 1.2, 7.2_

  - [ ] 4.3 Write unit tests for ProgressIndicator
    - Test active step node has gold styling
    - Test completed step nodes have brown fill and checkmark
    - Test upcoming step nodes have outlined/muted styling
    - _Requirements: 7.3_

- [ ] 5. Implement Step 1 — Collateral Selection
  - [ ] 5.1 Create `frontend/src/components/wizard/steps/Step1_CollateralSelection.tsx`
    - Props: `{ walletAddress: string }`
    - Render animal type select (cattle/goat/sheep), count input, appraised value input
    - On "Next": validate count > 0 and appraisedValue > 0 (integers); call `setStepError(1, msg)` on failure
    - On valid: call `POST /api/collateral/register`, sign with Freighter, submit XDR via `submitSignedXdr`
    - On success: call `setCollateralField("collateralId", result)`, `nextStep()`
    - On API/signing failure: call `setStepError(1, message)`
    - Display `stepErrors[1]` inline if present
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 5.2 Write property tests for Step 1 validation
    - **Property 1: Step advancement requires valid inputs** — for any count/appraisedValue that is empty, whitespace, zero, or negative, `currentStep` remains 1 after attempted advance
    - **Property 5: Whitespace/zero/negative inputs are invalid** — for any string composed of whitespace or numeric value ≤ 0, validation rejects and step does not advance
    - Tag: `// Feature: loan-request-wizard, Property 1, Property 5`
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 5.3 Write unit tests for Step 1
    - Test successful collateral registration flow (mock API + Freighter)
    - Test API error displays error message and stays on step 1
    - Test Freighter signing rejection displays error and stays on step 1
    - _Requirements: 2.5, 2.6, 2.7_

- [ ] 6. Implement Step 2 — Loan Amount
  - [ ] 6.1 Create `frontend/src/components/wizard/steps/Step2_LoanAmount.tsx`
    - Read `collateral.collateralId` and `collateral.appraisedValue` from store (read-only display)
    - Render loan amount input (stroops)
    - Compute and display LTV live: `(loanAmount / appraisedValue) * 100` rounded to 2 decimal places
    - On "Next": validate loanAmount > 0 and LTV ≤ 80%; call `setStepError(2, msg)` on failure
    - On valid: call `setLoanField("loanAmount", value)`, `nextStep()`
    - Display `stepErrors[2]` inline if present
    - Render "Back" button that calls `prevStep()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.2_

  - [ ] 6.2 Write property tests for Step 2 validation and LTV
    - **Property 3: LTV computation is consistent** — for any positive integer loanAmount and appraisedValue, displayed LTV = `(loanAmount / appraisedValue) * 100` rounded to 2dp
    - **Property 4: LTV 80% boundary enforcement** — for any (loanAmount, appraisedValue) where LTV > 80%, validation rejects and `currentStep` remains 2
    - Tag: `// Feature: loan-request-wizard, Property 3, Property 4`
    - _Requirements: 3.3, 3.5_

  - [ ] 6.3 Write unit tests for Step 2
    - Test LTV display updates on input change
    - Test exact 80% boundary (80.00% allowed, 80.01% rejected)
    - Test back navigation returns to step 1 with collateral fields intact
    - _Requirements: 3.3, 3.5, 6.2_

- [ ] 7. Checkpoint — steps 1 and 2 tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Step 3 — Review Terms
  - [ ] 8.1 Create `frontend/src/components/wizard/steps/Step3_ReviewTerms.tsx`
    - Display read-only summary: collateral type, count, appraised value, collateral ID, loan amount, LTV
    - On mount: call `POST /api/loan/repayment-preview` with `{ loan_id: collateralId, amount: loanAmount }`
    - Show loading spinner while fetching; call `setRepaymentPreview(data)` on success
    - Render `<HealthGauge value={projectedHealthFactorBps} />` when preview available
    - Show liquidation warning if `projectedHealthFactorBps < 10_000`
    - On API error: call `setStepError(3, message)`, disable "Next" button
    - Enable "Next" only when preview loaded successfully; "Next" calls `nextStep()`
    - Render "Back" button that calls `prevStep()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.3_

  - [ ] 8.2 Write property tests for Step 3
    - **Property 1 (continued): Step advancement requires valid inputs** — when preview fetch fails, "Next" is disabled and `currentStep` remains 3
    - Tag: `// Feature: loan-request-wizard, Property 1`
    - _Requirements: 4.5_

  - [ ] 8.3 Write unit tests for Step 3
    - Test loading state renders spinner
    - Test liquidation warning renders when health factor < 10 000 bps
    - Test no warning when health factor ≥ 10 000 bps
    - Test preview API error disables Next and shows error
    - Test back navigation returns to step 2 with loan amount intact
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 6.3_

- [ ] 9. Implement Step 4 — Confirm & Submit
  - [ ] 9.1 Create `frontend/src/components/wizard/steps/Step4_ConfirmSubmit.tsx`
    - Props: `{ walletAddress: string }`
    - Display full read-only summary: all collateral fields, loan amount, LTV, principal, interest, fees, projected health factor
    - On "Submit": set `submitting: true`, call `POST /api/loan/request`, sign with Freighter, submit XDR
    - Disable Submit button and show loading indicator while `submitting === true`
    - On success: call `setSuccessLoanId(loanId)`, `reset()`; display success message with loan ID
    - On failure: call `setStepError(4, message)`, `setSubmitting(false)`; re-enable Submit
    - Render "Back" button that calls `prevStep()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 9.2 Write property tests for Step 4
    - **Property 6 (continued): Store reset clears all state** — after successful submission, store equals initial state
    - Tag: `// Feature: loan-request-wizard, Property 6`
    - _Requirements: 5.6_

  - [ ] 9.3 Write unit tests for Step 4
    - Test full summary displays all fields from store
    - Test Submit button disabled during loading
    - Test success message shows returned loan ID
    - Test API error re-enables Submit and shows error message
    - Test Freighter rejection re-enables Submit and shows error message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Implement LoanWizard orchestrator
  - [ ] 10.1 Create `frontend/src/components/wizard/LoanWizard.tsx`
    - Props: `{ walletAddress: string }`
    - Read `currentStep` from WizardStore
    - Render `<ProgressIndicator currentStep={currentStep} totalSteps={4} />`
    - Conditionally render active step component based on `currentStep`
    - Pass `walletAddress` to Step1 and Step4
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 10.2 Write unit tests for LoanWizard
    - Test renders ProgressIndicator on all steps
    - Test renders correct step component for each `currentStep` value
    - Test Back button absent on step 1, present on steps 2–4
    - Test Submit button present on step 4, Next button on steps 1–3
    - _Requirements: 1.1, 1.3, 1.4_

- [ ] 11. Wire wizard into the /borrow page
  - [ ] 11.1 Update `frontend/src/app/borrow/page.tsx`
    - Remove `LoanForm` import and usage
    - Import and render `<LoanWizard walletAddress={wallet} />` in place of `<LoanForm />`
    - Wrap the page content with the Zustand store scope (store is module-level, scoped by page navigation)
    - _Requirements: 1.5, 8.4, 8.5_

- [ ] 12. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive coverage
- Each task references specific requirements for traceability
- Property tests use `fast-check` with minimum 100 iterations per property
- Unit tests use the existing Vitest/Jest setup in `frontend/src/__tests__/`
- All API calls reuse the existing `submitSignedXdr` utility from `@/lib/stellarUtils`
