import React from "react";
import { act, render, screen } from "@testing-library/react";
import OfflineBanner from "../components/OfflineBanner";

describe("OfflineBanner", () => {
  afterEach(() => {
    // Restore navigator.onLine to true
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("renders banner when navigator.onLine is false", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    render(<OfflineBanner />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/You are offline/)).toBeTruthy();
  });

  it("does not render banner when navigator.onLine is true", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    render(<OfflineBanner />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("banner disappears when online event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    render(<OfflineBanner />);
    expect(screen.getByRole("alert")).toBeTruthy();

    act(() => {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("has aria-live assertive region", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    render(<OfflineBanner />);
    const banner = screen.getByRole("alert");
    expect(banner.getAttribute("aria-live")).toBe("assertive");
  });
});
