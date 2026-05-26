/**
 * Component tests for CollateralGrid.
 * Covers loading, populated, empty, and card click states.
 * Closes #362
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CollateralGrid from "../components/CollateralGrid";
import { makeCollateral } from "./fixtures";

const mockCollateral = [
  makeCollateral({ id: "col-1", animal_type: "cattle", count: 3, appraised_value: 10_000_000, createdAt: "2026-01-15T00:00:00.000Z" }),
  makeCollateral({ id: "col-2", animal_type: "goat", count: 10, appraised_value: 5_000_000, createdAt: "2026-02-01T00:00:00.000Z" }),
];

describe("CollateralGrid", () => {
  describe("loading state", () => {
    it("renders skeleton cards while loading", () => {
      const { container } = render(
        <CollateralGrid collaterals={[]} loading={true} onCardClick={jest.fn()} />
      );
      const pulseCards = container.querySelectorAll(".animate-pulse");
      expect(pulseCards.length).toBeGreaterThan(0);
    });

    it("does not render collateral data while loading", () => {
      render(
        <CollateralGrid collaterals={mockCollateral} loading={true} onCardClick={jest.fn()} />
      );
      expect(screen.queryByText("cattle")).toBeNull();
    });
  });

  describe("populated state", () => {
    it("renders a card for each collateral item", () => {
      render(
        <CollateralGrid collaterals={mockCollateral} loading={false} onCardClick={jest.fn()} />
      );
      expect(screen.getByText("cattle")).toBeTruthy();
      expect(screen.getByText("goat")).toBeTruthy();
    });

    it("displays the count badge", () => {
      render(
        <CollateralGrid collaterals={mockCollateral} loading={false} onCardClick={jest.fn()} />
      );
      expect(screen.getByText("3x")).toBeTruthy();
      expect(screen.getByText("10x")).toBeTruthy();
    });

    it("displays appraised value in XLM", () => {
      render(
        <CollateralGrid collaterals={mockCollateral} loading={false} onCardClick={jest.fn()} />
      );
      // 10_000_000 stroops / 1e7 = 1.00 XLM
      expect(screen.getByText("1.00 XLM")).toBeTruthy();
    });

    it("displays the correct animal icon for cattle", () => {
      render(
        <CollateralGrid collaterals={[mockCollateral[0]]} loading={false} onCardClick={jest.fn()} />
      );
      expect(screen.getByText("🐄")).toBeTruthy();
    });

    it("displays the correct animal icon for goat", () => {
      render(
        <CollateralGrid collaterals={[mockCollateral[1]]} loading={false} onCardClick={jest.fn()} />
      );
      expect(screen.getByText("🐐")).toBeTruthy();
    });

    it("displays fallback icon for unknown animal type", () => {
      const unknown = makeCollateral({ id: "col-x", animal_type: "llama" });
      render(
        <CollateralGrid collaterals={[unknown]} loading={false} onCardClick={jest.fn()} />
      );
      expect(screen.getByText("🐾")).toBeTruthy();
    });

    it("shows truncated collateral ID", () => {
      render(
        <CollateralGrid collaterals={[mockCollateral[0]]} loading={false} onCardClick={jest.fn()} />
      );
      // id "col-1" sliced to 8 chars = "col-1" (shorter than 8)
      expect(screen.getByText(/ID: col-1/)).toBeTruthy();
    });
  });

  describe("empty state", () => {
    it("renders an empty grid with no cards when collaterals is empty", () => {
      const { container } = render(
        <CollateralGrid collaterals={[]} loading={false} onCardClick={jest.fn()} />
      );
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBe(0);
    });
  });

  describe("card click interaction", () => {
    it("calls onCardClick with the correct id when a card is clicked", () => {
      const onCardClick = jest.fn();
      render(
        <CollateralGrid collaterals={mockCollateral} loading={false} onCardClick={onCardClick} />
      );
      fireEvent.click(screen.getByText("cattle").closest("button")!);
      expect(onCardClick).toHaveBeenCalledWith("col-1");
    });

    it("calls onCardClick for each card independently", () => {
      const onCardClick = jest.fn();
      render(
        <CollateralGrid collaterals={mockCollateral} loading={false} onCardClick={onCardClick} />
      );
      fireEvent.click(screen.getByText("goat").closest("button")!);
      expect(onCardClick).toHaveBeenCalledWith("col-2");
    });
  });
});
