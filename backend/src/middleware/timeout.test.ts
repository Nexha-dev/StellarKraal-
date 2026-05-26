import { Request, Response, NextFunction } from "express";
import { timeoutMiddleware } from "./timeout";

describe("timeoutMiddleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let onMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    onMock = jest.fn();

    req = {
      method: "POST",
      path: "/api/test",
    } as Partial<Request>;

    res = {
      status: statusMock,
      json: jsonMock,
      on: onMock,
      headersSent: false,
    } as Partial<Response>;

    next = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should call next immediately", () => {
    const middleware = timeoutMiddleware(30000);
    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should return 504 when request exceeds timeout", () => {
    const middleware = timeoutMiddleware(1000);
    middleware(req as Request, res as Response, next);

    jest.advanceTimersByTime(1001);

    expect(statusMock).toHaveBeenCalledWith(504);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Request timeout" });
  });

  it("should not timeout if response finishes in time", () => {
    const middleware = timeoutMiddleware(1000);
    middleware(req as Request, res as Response, next);

    const finishCallback = onMock.mock.calls.find(
      (call) => call[0] === "finish"
    )?.[1];
    finishCallback();

    jest.advanceTimersByTime(1001);

    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it("should not send response if headers already sent", () => {
    const middleware = timeoutMiddleware(1000);
    res.headersSent = true;
    middleware(req as Request, res as Response, next);

    jest.advanceTimersByTime(1001);

    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it("should clear timer on response close", () => {
    const middleware = timeoutMiddleware(1000);
    middleware(req as Request, res as Response, next);

    const closeCallback = onMock.mock.calls.find(
      (call) => call[0] === "close"
    )?.[1];
    closeCallback();

    jest.advanceTimersByTime(1001);

    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it("should log timeout with request context", () => {
    const mockLogger = {
      warn: jest.fn(),
    };
    (req as any).logger = mockLogger;
    (req as any).requestId = "test-request-id";

    const middleware = timeoutMiddleware(15000);
    middleware(req as Request, res as Response, next);

    jest.advanceTimersByTime(15001);

    expect(mockLogger.warn).toHaveBeenCalledWith("Request timeout", {
      requestId: "test-request-id",
      method: "POST",
      path: "/api/test",
      timeoutMs: 15000,
    });
  });
});
