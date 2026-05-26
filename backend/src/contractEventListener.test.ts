import { startEventListener, stopEventListener } from "./contractEventListener";

jest.mock("@stellar/stellar-sdk", () => ({
  SorobanRpc: {
    Server: jest.fn().mockImplementation(() => ({
      getEvents: jest.fn().mockResolvedValue({ events: [] }),
    })),
  },
  xdr: {
    ScVal: {
      fromXDR: jest.fn().mockReturnValue({ vec: () => [] }),
    },
  },
}));

jest.mock("./utils/logger", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock("./db/store", () => ({
  insertCollateral: jest.fn(),
  insertLoan: jest.fn(),
  updateTransaction: jest.fn(),
}));

describe("contractEventListener", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    process.env.CONTRACT_ID = "CTEST123";
  });

  afterEach(() => {
    stopEventListener();
    jest.useRealTimers();
    delete process.env.CONTRACT_ID;
  });

  it("starts and stops without error", () => {
    expect(() => startEventListener(1000)).not.toThrow();
    expect(() => stopEventListener()).not.toThrow();
  });

  it("does not start when CONTRACT_ID is missing", () => {
    delete process.env.CONTRACT_ID;
    const logger = require("./utils/logger").default;
    startEventListener(1000);
    expect(logger.warn).toHaveBeenCalledWith("event_listener_disabled", expect.any(Object));
  });

  it("calling stopEventListener twice is safe", () => {
    startEventListener(1000);
    stopEventListener();
    expect(() => stopEventListener()).not.toThrow();
  });
});
