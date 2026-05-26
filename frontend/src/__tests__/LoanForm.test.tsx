import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoanForm from "../components/LoanForm";

const mockSignTransaction = jest.fn();
const mockSubmitSignedXdr = jest.fn();

jest.mock("@stellar/freighter-api", () => ({
  signTransaction: (...args: any[]) => mockSignTransaction(...args),
}));

jest.mock("../lib/stellarUtils", () => ({
  submitSignedXdr: (...args: any[]) => mockSubmitSignedXdr(...args),
  healthColor: () => "#16a34a",
  formatStroops: (s: number) => `${s / 1e7} XLM`,
}));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  mockSignTransaction.mockReset();
  mockSubmitSignedXdr.mockReset();
  (global as any).fetch = fetchMock;
});

describe("LoanForm", () => {
  it("renders collateral step by default", () => {
    render(<LoanForm walletAddress="GTEST" />);
    expect(screen.getByText("1. Register Collateral")).toBeTruthy();
    expect(screen.getByText("Register & Continue")).toBeTruthy();
  });

  it("renders animal type options", () => {
    render(<LoanForm walletAddress="GTEST" />);
    expect(screen.getByText("cattle")).toBeTruthy();
    expect(screen.getByText("goat")).toBeTruthy();
    expect(screen.getByText("sheep")).toBeTruthy();
  });

  it("advances to loan step after successful collateral registration", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ xdr: "test-xdr" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed-xdr" });
    mockSubmitSignedXdr.mockResolvedValue("collateral-id-123");

    render(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Count"), { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("Appraised value (stroops)"), { target: { value: "1000000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() =>
      expect(screen.getByText("2. Request Loan")).toBeTruthy()
    );
    expect(screen.getByText(/Collateral registered/)).toBeTruthy();
  });

  it("shows error status when collateral registration fails", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    render(<LoanForm walletAddress="GTEST" />);
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() =>
      expect(screen.getByText("❌ Network error")).toBeTruthy()
    );
  });

  it("submits loan request and shows success", async () => {
    // First call: register collateral
    fetchMock
      .mockResolvedValueOnce({ json: async () => ({ xdr: "xdr1" }) })
      // Second call: request loan
      .mockResolvedValueOnce({ json: async () => ({ xdr: "xdr2" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("loan-id-99");

    render(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Count"), { target: { value: "3" } });
    fireEvent.change(screen.getByPlaceholderText("Appraised value (stroops)"), { target: { value: "500000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));

    fireEvent.change(screen.getByPlaceholderText("Collateral ID"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Loan amount (stroops)"), { target: { value: "200000" } });
    fireEvent.click(screen.getByText("Request Loan"));

    await waitFor(() =>
      expect(screen.getByText(/Loan disbursed/)).toBeTruthy()
    );
  });

  it("shows error when loan request fails", async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => ({ xdr: "xdr1" }) })
      .mockRejectedValueOnce(new Error("Loan failed"));
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("col-1");

    render(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Count"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Appraised value (stroops)"), { target: { value: "100000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));
    fireEvent.click(screen.getByText("Request Loan"));

    await waitFor(() =>
      expect(screen.getByText("❌ Loan failed")).toBeTruthy()
    );
  });
});
