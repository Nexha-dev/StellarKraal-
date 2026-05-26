import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import LoanRepaymentCalculator from "../components/LoanRepaymentCalculator";

jest.mock("../components/HealthGauge", () => ({
  __esModule: true,
  default: ({ value }: { value: number }) => <div>Health: {value}</div>,
}));

describe("LoanRepaymentCalculator", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 1 }, { id: 2 }] }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        loan_id: 1,
        repayment_amount: 100,
        breakdown: {
          principal: 100,
          interest: 0,
          fees: 0,
          remaining_balance: 900,
        },
        projected_health_factor_bps: 12000,
        fully_repaid: false,
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces preview API and allows proceed-to-repay", async () => {
    const onProceed = jest.fn();
    render(<LoanRepaymentCalculator onProceed={onProceed} />);

    fireEvent.change(screen.getByPlaceholderText("Enter loan ID"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter repayment amount"), {
      target: { value: "100" },
    });

    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Proceed to Repay")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Proceed to Repay"));
    expect(onProceed).toHaveBeenCalledWith("1", "100");
  });
});
