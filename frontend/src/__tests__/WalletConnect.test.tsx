import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WalletConnect from "../components/WalletConnect";

const mockIsConnected = jest.fn();
const mockGetAddress = jest.fn();
const mockSetAllowed = jest.fn();

jest.mock("@stellar/freighter-api", () => ({
  isConnected: (...args: any[]) => mockIsConnected(...args),
  getAddress: (...args: any[]) => mockGetAddress(...args),
  setAllowed: (...args: any[]) => mockSetAllowed(...args),
}));

describe("WalletConnect", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders connect button initially", () => {
    render(<WalletConnect onConnect={jest.fn()} />);
    expect(screen.getByText("Connect Freighter Wallet")).toBeTruthy();
  });

  it("calls onConnect and shows truncated address on success", async () => {
    mockIsConnected.mockResolvedValue(true);
    mockGetAddress.mockResolvedValue({ address: "GABCDEF1234567890ABCDEF" });
    const onConnect = jest.fn();

    render(<WalletConnect onConnect={onConnect} />);
    fireEvent.click(screen.getByText("Connect Freighter Wallet"));

    await waitFor(() => expect(onConnect).toHaveBeenCalledWith("GABCDEF1234567890ABCDEF"));
    expect(screen.getByText(/GABCDE/)).toBeTruthy();
  });

  it("calls setAllowed when not connected", async () => {
    mockIsConnected.mockResolvedValue(false);
    mockSetAllowed.mockResolvedValue(undefined);
    mockGetAddress.mockResolvedValue({ address: "GTEST123456789012345678" });

    render(<WalletConnect onConnect={jest.fn()} />);
    fireEvent.click(screen.getByText("Connect Freighter Wallet"));

    await waitFor(() => expect(mockSetAllowed).toHaveBeenCalled());
  });

  it("shows error message on failure", async () => {
    mockIsConnected.mockRejectedValue(new Error("Freighter not installed"));

    render(<WalletConnect onConnect={jest.fn()} />);
    fireEvent.click(screen.getByText("Connect Freighter Wallet"));

    await waitFor(() =>
      expect(screen.getByText("Freighter not installed")).toBeTruthy()
    );
  });
});
