import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import EmptyState from "../components/EmptyState";
import {
  EmptyLoansIllustration,
  EmptyCollateralIllustration,
  EmptyTransactionsIllustration,
} from "../components/illustrations";

describe("EmptyState", () => {
  const onCta = jest.fn();

  beforeEach(() => onCta.mockReset());

  it("renders illustration, message, and CTA", () => {
    render(
      <EmptyState
        illustration={<EmptyLoansIllustration />}
        message="You have no active loans"
        ctaLabel="Apply for a Loan"
        onCta={onCta}
      />
    );
    expect(screen.getByRole("status").textContent).toBe("You have no active loans");
    expect(screen.getByRole("button", { name: "Apply for a Loan" })).toBeTruthy();
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("calls onCta when CTA button is clicked", () => {
    render(
      <EmptyState
        illustration={<EmptyCollateralIllustration />}
        message="No collateral registered"
        ctaLabel="Register Collateral"
        onCta={onCta}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Register Collateral" }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("CTA button is keyboard focusable", () => {
    render(
      <EmptyState
        illustration={<EmptyTransactionsIllustration />}
        message="No transactions yet"
        ctaLabel="View Loans"
        onCta={onCta}
      />
    );
    const btn = screen.getByRole("button", { name: "View Loans" });
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });

  it("SVG has aria-hidden", () => {
    render(
      <EmptyState
        illustration={<EmptyLoansIllustration />}
        message="msg"
        ctaLabel="cta"
        onCta={onCta}
      />
    );
    // The wrapper div has aria-hidden
    const hiddenWrapper = document.querySelector('[aria-hidden="true"]');
    expect(hiddenWrapper).toBeTruthy();
  });

  it("renders correctly with each illustration variant", () => {
    const { rerender } = render(
      <EmptyState illustration={<EmptyLoansIllustration />} message="Loans" ctaLabel="Go" onCta={onCta} />
    );
    expect(screen.getByRole("status").textContent).toBe("Loans");

    rerender(
      <EmptyState illustration={<EmptyCollateralIllustration />} message="Collateral" ctaLabel="Go" onCta={onCta} />
    );
    expect(screen.getByRole("status").textContent).toBe("Collateral");

    rerender(
      <EmptyState illustration={<EmptyTransactionsIllustration />} message="Transactions" ctaLabel="Go" onCta={onCta} />
    );
    expect(screen.getByRole("status").textContent).toBe("Transactions");
  });
});
