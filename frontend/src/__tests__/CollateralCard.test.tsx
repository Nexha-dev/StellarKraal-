import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CollateralCard from "../components/CollateralCard";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
});

describe("CollateralCard", () => {
  it("renders loan lookup form", () => {
    render(<CollateralCard walletAddress="GTEST" />);
    expect(screen.getByPlaceholderText("Loan ID")).toBeTruthy();
    expect(screen.getByText("Fetch")).toBeTruthy();
  });

  it("fetches and displays loan data", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ id: 42, status: "active" }),
    });

    render(<CollateralCard walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Loan ID"), {
      target: { value: "42" },
    });
    fireEvent.click(screen.getByText("Fetch"));

    await waitFor(() =>
      expect(screen.getByText(/"status": "active"/)).toBeTruthy()
    );
  });

  it("shows loading state while fetching", async () => {
    let resolve: (v: any) => void;
    fetchMock.mockReturnValue(
      new Promise((r) => { resolve = r; })
    );

    render(<CollateralCard walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Loan ID"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByText("Fetch"));

    expect(screen.getByText("…")).toBeTruthy();
    resolve!({ json: async () => ({}) });
  });

  it("button is disabled while loading", async () => {
    let resolve: (v: any) => void;
    fetchMock.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<CollateralCard walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Loan ID"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByText("Fetch"));

    expect((screen.getByText("…") as HTMLButtonElement).disabled).toBe(true);
    resolve!({ json: async () => ({}) });
  });
});
