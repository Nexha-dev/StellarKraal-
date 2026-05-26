import React from "react";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../components/ErrorBoundary";

// Suppress expected console.error noise from React's error boundary
beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => (console.error as jest.Mock).mockRestore());

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("test explosion");
  return <span>OK</span>;
}

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("shows fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /reload/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /report issue/i })).toBeTruthy();
  });

  it("includes the section name in the fallback heading", () => {
    render(
      <ErrorBoundary section="Dashboard">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/dashboard.*something went wrong/i)).toBeTruthy();
  });

  it("logs the error to console in development", () => {
    const spy = console.error as jest.Mock;
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    // componentDidCatch calls console.error in dev (NODE_ENV=test counts as non-production)
    expect(spy).toHaveBeenCalled();
  });
});
