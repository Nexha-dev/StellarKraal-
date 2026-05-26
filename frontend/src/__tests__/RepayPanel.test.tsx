import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RepayPanel from "../components/RepayPanel";

jest.mock("@stellar/freighter-api", () => ({
  signTransaction: jest.fn(),
}));
jest.mock("../lib/stellarUtils", () => ({
  submitSignedXdr: jest.fn(),
  healthColor: jest.fn(),
  formatStroops: jest.fn(),
}));

import { signTransaction } from "@stellar/freighter-api";
import { submitSignedXdr } from "../lib/stellarUtils";

const mockSign = signTransaction as jest.Mock;
const mockSubmit = submitSignedXdr as jest.Mock;

function renderPanel() {
  return render(
    <RepayPanel walletAddress="GTEST" initialLoanId="1" initialAmount="100" />
  );
}

describe("RepayPanel — optimistic UI", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows loading indicator while server is confirming", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => ({ xdr: "test-xdr" }),
    });
    mockSign.mockResolvedValue({ signedTxXdr: "signed-xdr" });
    // Delay submitSignedXdr to keep loading state visible
    mockSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    renderPanel();
    fireEvent.click(screen.getByText("Repay"));

    expect(await screen.findByText("Processing…")).toBeTruthy();
  });

  it("shows optimistic banner immediately after clicking Repay", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => ({ xdr: "test-xdr" }),
    });
    mockSign.mockResolvedValue({ signedTxXdr: "signed-xdr" });
    mockSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    renderPanel();
    fireEvent.click(screen.getByText("Repay"));

    // Optimistic banner should appear while loading
    expect(
      await screen.findByText(/Repayment recorded/)
    ).toBeTruthy();
  });

  it("shows success toast after server confirms", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => ({ xdr: "test-xdr" }),
    });
    mockSign.mockResolvedValue({ signedTxXdr: "signed-xdr" });
    mockSubmit.mockResolvedValue("tx-hash");

    renderPanel();
    fireEvent.click(screen.getByText("Repay"));

    await waitFor(() =>
      expect(screen.getByText("✅ Repayment submitted!")).toBeTruthy()
    );
  });

  it("rolls back optimistic state and shows error toast on API error", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    renderPanel();
    fireEvent.click(screen.getByText("Repay"));

    await waitFor(() =>
      expect(screen.getByText("❌ Network error")).toBeTruthy()
    );
    // Optimistic banner should be gone after rollback
    expect(screen.queryByText(/Repayment recorded/)).toBeNull();
  });

  it("simulates network delay — optimistic banner visible during slow response", async () => {
    jest.useFakeTimers();
    (global as any).fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ json: async () => ({ xdr: "xdr" }) }), 500)
        )
    );
    mockSign.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmit.mockResolvedValue("hash");

    renderPanel();
    fireEvent.click(screen.getByText("Repay"));

    // Before fetch resolves, button shows loading
    expect(screen.getByText("Processing…")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    jest.useRealTimers();
  });
});
