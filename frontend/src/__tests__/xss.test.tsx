/**
 * XSS prevention tests for user-facing input fields.
 * Verifies that injected script tags and event handlers are not executed
 * and that stored values are rendered safely.
 * Closes #370
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoanForm from "../components/LoanForm";
import CollateralRegistrationForm from "../components/CollateralRegistrationForm";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@stellar/freighter-api", () => ({
  signTransaction: jest.fn().mockResolvedValue({ signedTxXdr: "signed" }),
}));

jest.mock("../lib/stellarUtils", () => ({
  submitSignedXdr: jest.fn().mockResolvedValue("result-id"),
  healthColor: () => "#16a34a",
  formatStroops: (s: number) => `${s}`,
}));

jest.mock("framer-motion", () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  useReducedMotion: () => false,
}));

const XSS_PAYLOADS = [
  '<script>window.__xss=1</script>',
  '<img src=x onerror="window.__xss=1">',
  '"><script>window.__xss=1</script>',
  "javascript:window.__xss=1",
  '<svg onload="window.__xss=1">',
  '<a href="javascript:window.__xss=1">click</a>',
];

beforeEach(() => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ xdr: "mock_xdr" }),
  });
  (window as any).__xss = undefined;
  localStorage.clear();
});

// ── LoanForm XSS tests ────────────────────────────────────────────────────────

describe("LoanForm – XSS prevention", () => {
  it("does not execute script injected into count field", () => {
    render(<LoanForm walletAddress="GTEST" />);
    const input = screen.getByPlaceholderText("Count");
    fireEvent.change(input, { target: { value: '<script>window.__xss=1</script>' } });
    expect((window as any).__xss).toBeUndefined();
  });

  it("does not execute script injected into appraised value field", () => {
    render(<LoanForm walletAddress="GTEST" />);
    const input = screen.getByPlaceholderText("Appraised value (stroops)");
    fireEvent.change(input, { target: { value: '<img src=x onerror="window.__xss=1">' } });
    expect((window as any).__xss).toBeUndefined();
  });

  it("does not attach onerror handler from injected value", () => {
    render(<LoanForm walletAddress="GTEST" />);
    const input = screen.getByPlaceholderText("Count");
    fireEvent.change(input, { target: { value: '<img src=x onerror="window.__xss=1">' } });
    // No img element with onerror should be in the DOM
    const imgs = document.querySelectorAll('img[onerror]');
    expect(imgs.length).toBe(0);
    expect((window as any).__xss).toBeUndefined();
  });

  it.each(XSS_PAYLOADS)("count field safely renders payload: %s", (payload) => {
    render(<LoanForm walletAddress="GTEST" />);
    const input = screen.getByPlaceholderText("Count");
    fireEvent.change(input, { target: { value: payload } });
    // The key assertion: no script execution regardless of input type handling
    expect((window as any).__xss).toBeUndefined();
    expect(document.querySelectorAll('script').length).toBe(0);
  });

  it("stored XSS: status message renders injected value as text, not HTML", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('<script>window.__xss=1</script>'));
    render(<LoanForm walletAddress="GTEST" />);
    fireEvent.click(screen.getByText("Register & Continue"));
    await waitFor(() => {
      expect((window as any).__xss).toBeUndefined();
      // The error message is rendered as text content, not executed
      const scripts = document.querySelectorAll('script');
      // No new script tags injected into DOM
      expect(scripts.length).toBe(0);
    });
  });
});

// ── CollateralRegistrationForm XSS tests ─────────────────────────────────────

describe("CollateralRegistrationForm – XSS prevention", () => {
  const walletAddress = "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR";

  it("does not execute script injected into quantity field", () => {
    render(<CollateralRegistrationForm walletAddress={walletAddress} />);
    const input = screen.getByPlaceholderText("Number of animals");
    fireEvent.change(input, { target: { value: '<script>window.__xss=1</script>' } });
    expect((window as any).__xss).toBeUndefined();
  });

  it("does not execute script injected into location field", () => {
    render(<CollateralRegistrationForm walletAddress={walletAddress} />);
    const input = screen.getByPlaceholderText("Farm or region name");
    fireEvent.change(input, { target: { value: '<svg onload="window.__xss=1">' } });
    expect((window as any).__xss).toBeUndefined();
  });

  it("does not execute script injected into weight field", () => {
    render(<CollateralRegistrationForm walletAddress={walletAddress} />);
    const input = screen.getByPlaceholderText("Average weight per animal");
    fireEvent.change(input, { target: { value: '"><script>window.__xss=1</script>' } });
    expect((window as any).__xss).toBeUndefined();
  });

  it("does not execute script injected into appraised value field", () => {
    render(<CollateralRegistrationForm walletAddress={walletAddress} />);
    const input = screen.getByPlaceholderText("Total value in stroops");
    fireEvent.change(input, { target: { value: '<img src=x onerror="window.__xss=1">' } });
    expect((window as any).__xss).toBeUndefined();
  });

  it.each(XSS_PAYLOADS)("location field safely renders payload: %s", (payload) => {
    render(<CollateralRegistrationForm walletAddress={walletAddress} />);
    const input = screen.getByPlaceholderText("Farm or region name");
    fireEvent.change(input, { target: { value: payload } });
    expect((window as any).__xss).toBeUndefined();
    // Text input preserves the raw string without executing it
    expect((input as HTMLInputElement).value).toBe(payload);
    expect(document.querySelectorAll('script').length).toBe(0);
  });

  it("no onerror handlers attached from any injected field value", () => {
    render(<CollateralRegistrationForm walletAddress={walletAddress} />);
    const fields = [
      screen.getByPlaceholderText("Number of animals"),
      screen.getByPlaceholderText("Farm or region name"),
      screen.getByPlaceholderText("Total value in stroops"),
    ];
    fields.forEach((f) =>
      fireEvent.change(f, { target: { value: '<img src=x onerror="window.__xss=1">' } })
    );
    expect(document.querySelectorAll('[onerror]').length).toBe(0);
    expect((window as any).__xss).toBeUndefined();
  });

  it("stored XSS: validation error message renders injected text safely", async () => {
    render(<CollateralRegistrationForm walletAddress={walletAddress} />);
    // Trigger validation with XSS in location (too short)
    const locationInput = screen.getByPlaceholderText("Farm or region name");
    fireEvent.change(locationInput, { target: { value: '<script>' } });
    await waitFor(() => {
      expect((window as any).__xss).toBeUndefined();
      expect(document.querySelectorAll('script').length).toBe(0);
    });
  });
});
