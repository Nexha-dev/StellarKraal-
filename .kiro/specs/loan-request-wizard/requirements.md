# Requirements Document

## Introduction

The Loan Request Wizard replaces the existing two-step `LoanForm` on the `/borrow` page with a guided, 4-step wizard that walks a borrower through collateral selection, loan amount entry, terms review, and final confirmation. The wizard preserves entered data when navigating backwards, validates each step before progression, displays a progress indicator, and shows a full loan summary before on-chain submission. State is managed via React Context or Zustand so that all wizard steps share a single source of truth.

## Glossary

- **Wizard**: The multi-step guided UI component that replaces the single `LoanForm`.
- **WizardState**: The shared data object holding all user inputs and derived values across wizard steps.
- **WizardStore**: The React Context provider or Zustand store that owns and exposes WizardState.
- **Step**: One of the four discrete screens within the Wizard (Collateral, Amount, Review, Confirm).
- **Collateral**: Livestock assets (cattle, goats, sheep) registered on-chain as loan security.
- **LTV (Loan-to-Value)**: The ratio of the requested loan amount to the appraised collateral value, expressed as a percentage.
- **Health Factor**: A numeric indicator (in basis points, 10 000 = 1.0×) of collateral adequacy relative to outstanding debt.
- **Stroops**: The smallest unit of XLM on the Stellar network (1 XLM = 10 000 000 stroops).
- **Borrower**: The authenticated wallet owner requesting a loan.
- **ProgressIndicator**: The UI element that displays the current step number and total step count.
- **ValidationError**: A user-facing message shown when a step's inputs fail validation rules.

---

## Requirements

### Requirement 1: Four-Step Wizard Structure

**User Story:** As a borrower, I want to complete my loan request through a clearly structured 4-step wizard, so that the process feels manageable and I always know where I am.

#### Acceptance Criteria

1. THE Wizard SHALL consist of exactly four sequential steps in this order: (1) Collateral Selection, (2) Loan Amount, (3) Review Terms, (4) Confirm & Submit.
2. WHEN the Wizard is rendered, THE ProgressIndicator SHALL display the label "Step N of 4" where N is the current step number (1–4).
3. WHEN the Borrower is on any step other than step 1, THE Wizard SHALL display a "Back" button that navigates to the previous step.
4. WHEN the Borrower is on step 4, THE Wizard SHALL display a "Submit" button instead of a "Next" button.
5. THE Wizard SHALL render within the existing `/borrow` page, replacing the current `LoanForm` component.

---

### Requirement 2: Step 1 – Collateral Selection

**User Story:** As a borrower, I want to select and register my livestock collateral in the first step, so that the system knows what assets back my loan.

#### Acceptance Criteria

1. THE Collateral_Step SHALL present input fields for: animal type (cattle, goat, sheep), animal count (positive integer), and appraised value in stroops (positive integer).
2. WHEN the Borrower submits Step 1, THE Collateral_Step SHALL validate that animal count is a positive integer greater than zero.
3. WHEN the Borrower submits Step 1, THE Collateral_Step SHALL validate that appraised value is a positive integer greater than zero.
4. IF any Step 1 validation fails, THEN THE Collateral_Step SHALL display a ValidationError message adjacent to the failing field and SHALL NOT advance to Step 2.
5. WHEN all Step 1 validations pass, THE Wizard SHALL call the `/api/collateral/register` endpoint, request wallet signature via Freighter, and submit the signed transaction.
6. WHEN the collateral registration transaction succeeds, THE WizardStore SHALL persist the returned collateral ID and the entered collateral details, and THE Wizard SHALL advance to Step 2.
7. IF the collateral registration transaction fails, THEN THE Collateral_Step SHALL display a ValidationError with the error message and SHALL NOT advance to Step 2.

---

### Requirement 3: Step 2 – Loan Amount

**User Story:** As a borrower, I want to enter my desired loan amount and see an immediate LTV preview, so that I can make an informed borrowing decision.

#### Acceptance Criteria

1. THE Amount_Step SHALL display the collateral ID and appraised value carried forward from Step 1.
2. THE Amount_Step SHALL present an input field for the loan amount in stroops (positive integer).
3. WHEN the Borrower enters a loan amount, THE Amount_Step SHALL compute and display the LTV ratio as: `(loanAmount / appraisedValue) × 100`, rounded to two decimal places.
4. WHEN the Borrower submits Step 2, THE Amount_Step SHALL validate that the loan amount is a positive integer greater than zero.
5. WHEN the Borrower submits Step 2, THE Amount_Step SHALL validate that the LTV ratio does not exceed 80%.
6. IF any Step 2 validation fails, THEN THE Amount_Step SHALL display a ValidationError message and SHALL NOT advance to Step 3.
7. WHEN all Step 2 validations pass, THE WizardStore SHALL persist the loan amount, and THE Wizard SHALL advance to Step 3.

---

### Requirement 4: Step 3 – Review Terms

**User Story:** As a borrower, I want to review the loan terms before committing, so that I understand the interest, fees, and health factor impact.

#### Acceptance Criteria

1. THE Review_Step SHALL display a read-only summary of: collateral type, animal count, appraised value, collateral ID, requested loan amount, and computed LTV ratio.
2. THE Review_Step SHALL call the `/api/loan/repayment-preview` endpoint using the collateral ID and loan amount to retrieve: principal, estimated interest, fees, and projected health factor.
3. WHEN the repayment preview is loading, THE Review_Step SHALL display a loading indicator.
4. WHEN the repayment preview is available, THE Review_Step SHALL display the HealthGauge component with the projected health factor value.
5. IF the repayment preview request fails, THEN THE Review_Step SHALL display a ValidationError with the error message and SHALL NOT allow advancement to Step 4.
6. IF the projected health factor is below 10 000 bps (1.0×), THEN THE Review_Step SHALL display a prominent warning that the loan is at risk of liquidation.
7. WHEN the repayment preview loads successfully, THE Wizard SHALL enable the "Next" button to advance to Step 4.

---

### Requirement 5: Step 4 – Confirm & Submit

**User Story:** As a borrower, I want to see a complete loan summary and confirm submission, so that I have one final chance to verify everything before the on-chain transaction.

#### Acceptance Criteria

1. THE Confirm_Step SHALL display a full read-only loan summary including: collateral type, animal count, appraised value, collateral ID, loan amount, LTV ratio, estimated interest, fees, and projected health factor.
2. WHEN the Borrower clicks "Submit", THE Confirm_Step SHALL call the `/api/loan/request` endpoint, request wallet signature via Freighter, and submit the signed transaction.
3. WHEN the loan request transaction is loading, THE Confirm_Step SHALL disable the "Submit" button and display a loading indicator.
4. WHEN the loan request transaction succeeds, THE Confirm_Step SHALL display a success message including the returned loan ID.
5. IF the loan request transaction fails, THEN THE Confirm_Step SHALL display a ValidationError with the error message and SHALL re-enable the "Submit" button.
6. WHEN the loan request transaction succeeds, THE WizardStore SHALL reset all wizard state to its initial values.

---

### Requirement 6: Back Navigation and State Persistence

**User Story:** As a borrower, I want to navigate back to previous steps without losing my entered data, so that I can correct mistakes without starting over.

#### Acceptance Criteria

1. WHEN the Borrower navigates back from Step 2 to Step 1, THE WizardStore SHALL retain the previously entered animal type, animal count, and appraised value.
2. WHEN the Borrower navigates back from Step 3 to Step 2, THE WizardStore SHALL retain the previously entered loan amount.
3. WHEN the Borrower navigates back from Step 4 to Step 3, THE WizardStore SHALL retain the repayment preview data.
4. THE WizardStore SHALL be the single source of truth for all wizard inputs; no step SHALL maintain independent local state for wizard data.

---

### Requirement 7: Progress Indicator

**User Story:** As a borrower, I want a visible progress indicator throughout the wizard, so that I always know how far along I am in the process.

#### Acceptance Criteria

1. THE ProgressIndicator SHALL be visible on all four wizard steps.
2. THE ProgressIndicator SHALL display the text "Step N of 4" where N matches the active step number.
3. THE ProgressIndicator SHALL visually distinguish the active step from completed and upcoming steps (e.g., via colour, fill, or icon).
4. WHEN the Borrower advances to a new step, THE ProgressIndicator SHALL update to reflect the new active step without a full page reload.

---

### Requirement 8: Wizard State Management

**User Story:** As a developer, I want wizard state managed in a dedicated store, so that all steps share consistent data and the implementation is maintainable.

#### Acceptance Criteria

1. THE WizardStore SHALL be implemented using either React Context with `useReducer` or Zustand.
2. THE WizardStore SHALL expose the current step index, all collateral fields, all loan fields, the repayment preview data, and any active error messages.
3. THE WizardStore SHALL expose actions for: advancing to the next step, returning to the previous step, updating individual fields, storing the repayment preview, and resetting all state.
4. WHEN the `/borrow` page mounts, THE WizardStore SHALL initialise with step 1 and all fields empty.
5. THE WizardStore SHALL be scoped to the `/borrow` page so that navigating away and returning resets the wizard to its initial state.
