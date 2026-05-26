import {
  getAppraisal,
  setAppraisal,
  invalidateAppraisal,
  invalidateAll,
  configureCacheTTL,
  _cacheSize,
} from "./appraisalCache";

// Silence logger output during tests
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
jest.mock("./logger", () => ({
  __esModule: true,
  default: mockLogger,
}));

beforeEach(() => {
  invalidateAll();
  configureCacheTTL(5 * 60 * 1000); // reset to default 5-minute TTL
  jest.clearAllMocks();
});

describe("appraisalCache — cache hit / miss", () => {
  it("returns null on cache miss", () => {
    expect(getAppraisal("col-1")).toBeNull();
  });

  it("logs a cache miss", () => {
    getAppraisal("col-miss");
    expect(mockLogger.debug).toHaveBeenCalledWith("appraisal_cache_miss", {
      collateralId: "col-miss",
    });
  });

  it("returns cached value on hit", () => {
    setAppraisal("col-1", 1000);
    const entry = getAppraisal("col-1");
    expect(entry).not.toBeNull();
    expect(entry!.value).toBe(1000);
    expect(entry!.stale).toBe(false);
  });

  it("logs a cache hit", () => {
    setAppraisal("col-hit", 500);
    getAppraisal("col-hit");
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "appraisal_cache_hit",
      expect.objectContaining({ collateralId: "col-hit" }),
    );
  });
});

describe("appraisalCache — TTL and stale flag", () => {
  it("defaults to a 5-minute TTL", () => {
    setAppraisal("col-ttl", 999);
    const entry = getAppraisal("col-ttl");
    expect(entry).not.toBeNull();
    expect(entry!.stale).toBe(false);
  });

  it("flags entry as stale when TTL has elapsed", () => {
    configureCacheTTL(1); // 1 ms TTL
    setAppraisal("col-stale", 500);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const entry = getAppraisal("col-stale");
        expect(entry).not.toBeNull();
        expect(entry!.stale).toBe(true);
        resolve();
      }, 10);
    });
  });

  it("logs a stale cache access", () => {
    configureCacheTTL(1);
    setAppraisal("col-stale-log", 200);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        getAppraisal("col-stale-log");
        expect(mockLogger.debug).toHaveBeenCalledWith(
          "appraisal_cache_stale",
          expect.objectContaining({ collateralId: "col-stale-log" }),
        );
        resolve();
      }, 10);
    });
  });

  it("does not mutate the stored entry when returning stale", () => {
    configureCacheTTL(1);
    setAppraisal("col-immutable", 300);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const first = getAppraisal("col-immutable");
        const second = getAppraisal("col-immutable");
        // Both reads should still return the entry (not deleted)
        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
        expect(_cacheSize()).toBe(1);
        resolve();
      }, 10);
    });
  });

  it("respects a custom TTL set via configureCacheTTL", () => {
    configureCacheTTL(50);
    setAppraisal("col-custom-ttl", 777);
    // Should be fresh immediately
    expect(getAppraisal("col-custom-ttl")!.stale).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(getAppraisal("col-custom-ttl")!.stale).toBe(true);
        resolve();
      }, 60);
    });
  });
});

describe("appraisalCache — cache invalidation on oracle price update", () => {
  it("invalidates a specific entry", () => {
    setAppraisal("col-3", 200);
    invalidateAppraisal("col-3");
    expect(getAppraisal("col-3")).toBeNull();
  });

  it("logs invalidation of a specific entry", () => {
    setAppraisal("col-log-inv", 100);
    invalidateAppraisal("col-log-inv");
    expect(mockLogger.info).toHaveBeenCalledWith("appraisal_cache_invalidated", {
      collateralId: "col-log-inv",
    });
  });

  it("does not throw when invalidating a non-existent key", () => {
    expect(() => invalidateAppraisal("does-not-exist")).not.toThrow();
  });

  it("does not log when invalidating a non-existent key", () => {
    invalidateAppraisal("ghost-key");
    expect(mockLogger.info).not.toHaveBeenCalledWith(
      "appraisal_cache_invalidated",
      expect.anything(),
    );
  });

  it("invalidateAll clears all entries", () => {
    setAppraisal("col-4", 100);
    setAppraisal("col-5", 200);
    invalidateAll();
    expect(_cacheSize()).toBe(0);
  });

  it("invalidateAll logs the count of cleared entries", () => {
    setAppraisal("col-a", 10);
    setAppraisal("col-b", 20);
    invalidateAll();
    expect(mockLogger.info).toHaveBeenCalledWith(
      "appraisal_cache_invalidated_all",
      { count: 2 },
    );
  });

  it("invalidateAll on empty cache logs count 0", () => {
    invalidateAll(); // cache already empty from beforeEach
    expect(mockLogger.info).toHaveBeenCalledWith(
      "appraisal_cache_invalidated_all",
      { count: 0 },
    );
  });

  it("after invalidateAll, new entries can be cached again", () => {
    setAppraisal("col-6", 300);
    invalidateAll();
    setAppraisal("col-6", 400);
    const entry = getAppraisal("col-6");
    expect(entry).not.toBeNull();
    expect(entry!.value).toBe(400);
    expect(entry!.stale).toBe(false);
  });
});

describe("appraisalCache — stale: true in response shape", () => {
  it("returned entry includes stale: false when fresh", () => {
    setAppraisal("col-resp", 1500);
    const entry = getAppraisal("col-resp");
    expect(entry).toMatchObject({ value: 1500, stale: false });
  });

  it("returned entry includes stale: true when expired", () => {
    configureCacheTTL(1);
    setAppraisal("col-resp-stale", 1500);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const entry = getAppraisal("col-resp-stale");
        expect(entry).toMatchObject({ value: 1500, stale: true });
        resolve();
      }, 10);
    });
  });
});
