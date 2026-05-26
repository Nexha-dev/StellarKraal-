export type LoanStatus = "pending" | "active" | "repaid" | "liquidated";

export interface TransitionRecord {
  from: LoanStatus;
  to: LoanStatus;
  at: string; // ISO timestamp
}

export class InvalidTransitionError extends Error {
  constructor(from: LoanStatus, to: LoanStatus) {
    super(`Invalid loan transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

// Valid transitions: from → allowed next states
const TRANSITIONS: Record<LoanStatus, LoanStatus[]> = {
  pending: ["active"],
  active: ["repaid", "liquidated"],
  repaid: [],
  liquidated: [],
};

/**
 * Validate and apply a loan status transition.
 * Throws InvalidTransitionError for disallowed transitions.
 * Returns the new status and appends to the history array.
 * @param current - The current loan status.
 * @param next - The desired next loan status.
 * @param history - Mutable array to append the transition record to.
 * @returns The new {@link LoanStatus} after the transition.
 * @throws {@link InvalidTransitionError} if the transition from `current` to `next` is not allowed.
 * @example
 * const history: TransitionRecord[] = [];
 * const newStatus = transition("pending", "active", history);
 */
export function transition(
  current: LoanStatus,
  next: LoanStatus,
  history: TransitionRecord[]
): LoanStatus {
  if (!TRANSITIONS[current].includes(next)) {
    throw new InvalidTransitionError(current, next);
  }
  history.push({ from: current, to: next, at: new Date().toISOString() });
  return next;
}

/**
 * Returns the valid next states from a given status.
 * @param status - The current loan status.
 * @returns Array of {@link LoanStatus} values that are valid next states.
 * @example
 * allowedTransitions("active"); // ["repaid", "liquidated"]
 */
export function allowedTransitions(status: LoanStatus): LoanStatus[] {
  return TRANSITIONS[status];
}
