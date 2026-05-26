/**
 * Additional component tests for LoanForm.
 * Covers field rendering, validation behavior, step navigation, and API submission.
 * Closes #361
 */
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

describe("LoanForm – field rendering", () => {
  it("renders all collateral step fields", () => {
    render(<LoanForm walletAddress="GTEST" />);
    expect(screen.getByRole("combobox")).toBeTruthy(); // animal type select
    expect(screen.getByPlaceholderText("Count")).toBeTruthy();
    expect(screen.getByPlaceholderText("Appraised value (stroops)")).toBeTruthy();
    expect(screen.getByText("Register & Continue")).toBeTruthy();
  });

  it("renders all loan step fields after advancing", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ xdr: "xdr1" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("col-99");

    render(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Count"), { target: { value: "2" } });
    fireEvent.change(screen.getByPlaceholderText("Appraised value (stroops)"), { target: { value: "500000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));
    expect(screen.getByPlaceholderText("Collateral ID")).toBeTruthy();
    expect(screen.getByPlaceholderText("Loan amount (stroops)")).toBeTruthy();
    expect(screen.getByText("Request Loan")).toBeTruthy();
  });

  it("animal type select defaults to cattle", () => {
    render(<LoanForm walletAddress="GTEST" />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("cattle");
  });

  it("animal type select contains all options", () => {
    render(<LoanForm walletAddress="GTEST" />);
    expect(screen.getByText("cattle")).toBeTruthy();
    expect(screen.getByText("goat")).toBeTruthy();
    expect(screen.getByText("sheep")).toBeTruthy();
  });
});

describe("LoanForm – button disabled state", () => {
  it("Register & Continue button is enabled initially", () => {
    render(<LoanForm walletAddress="GTEST" />);
    const btn = screen.getByText("Register & Continue") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("Register & Continue button is disabled while loading", async () => {
    // The requestLoan function sets loading=true; test that during loan request the button is disabled
    fetchMock
      .mockResolvedValueOnce({ json: async () => ({ xdr: "xdr1" }) })
      .mockReturnValueOnce(new Promise(() => {})); // never resolves — keeps loading state
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("col-1");

    render(<LoanForm walletAddress="GTEST" />);
    // Advance to loan step
    fireEvent.change(screen.getByPlaceholderText("Count"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Register & Continue"));
    await waitFor(() => screen.getByText("2. Request Loan"));

    // Click Request Loan — fetch never resolves so loading stays true
    fireEvent.click(screen.getByText("Request Loan"));

    await waitFor(() => {
      const btn = screen.getByText("Processing…") as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });
});

describe("LoanForm – step navigation", () => {
  it("stays on collateral step when registration fails", async () => {
    fetchMock.mockRejectedValue(new Error("Server error"));

    render(<LoanForm walletAddress="GTEST" />);
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("❌ Server error"));
    expect(screen.getByText("1. Register Collateral")).toBeTruthy();
  });

  it("advances to loan step after successful registration", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ xdr: "xdr1" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("col-id-1");

    render(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Count"), { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("Appraised value (stroops)"), { target: { value: "1000000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));
    // Review summary: success status shows the collateral ID
    expect(screen.getByText(/Collateral registered! ID: col-id-1/)).toBeTruthy();
  });
});

describe("LoanForm – API submission", () => {
  it("calls the collateral register endpoint with correct payload", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ xdr: "xdr1" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("col-1");

    render(<LoanForm walletAddress="GWALLET123" />);
    fireEvent.change(screen.getByPlaceholderText("Count"), { target: { value: "3" } });
    fireEvent.change(screen.getByPlaceholderText("Appraised value (stroops)"), { target: { value: "750000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/collateral/register"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"owner":"GWALLET123"'),
      })
    );
  });

  it("calls the loan request endpoint with correct payload", async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => ({ xdr: "xdr1" }) })
      .mockResolvedValueOnce({ json: async () => ({ xdr: "xdr2" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("loan-42");

    render(<LoanForm walletAddress="GWALLET123" />);
    fireEvent.change(screen.getByPlaceholderText("Count"), { target: { value: "2" } });
    fireEvent.change(screen.getByPlaceholderText("Appraised value (stroops)"), { target: { value: "200000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));

    fireEvent.change(screen.getByPlaceholderText("Collateral ID"), { target: { value: "7" } });
    fireEvent.change(screen.getByPlaceholderText("Loan amount (stroops)"), { target: { value: "100000" } });
    fireEvent.click(screen.getByText("Request Loan"));

    await waitFor(() => screen.getByText(/Loan disbursed! Loan ID: loan-42/));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/loan/request"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"borrower":"GWALLET123"'),
      })
    );
  });

  it("shows loan disbursed status with loan ID on success", async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => ({ xdr: "xdr1" }) })
      .mockResolvedValueOnce({ json: async () => ({ xdr: "xdr2" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("loan-99");

    render(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Count"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Appraised value (stroops)"), { target: { value: "100000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));
    fireEvent.change(screen.getByPlaceholderText("Collateral ID"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Loan amount (stroops)"), { target: { value: "50000" } });
    fireEvent.click(screen.getByText("Request Loan"));

    await waitFor(() =>
      expect(screen.getByText("✅ Loan disbursed! Loan ID: loan-99")).toBeTruthy()
    );
  });
});
