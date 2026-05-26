import { renderHook, act } from "@testing-library/react";
import { useFormAutoSave } from "@/hooks/useFormAutoSave";

describe("useFormAutoSave", () => {
  const storageKey = "test_form";
  const walletAddress = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("auto-saves data after interval", () => {
    const { result } = renderHook(() =>
      useFormAutoSave({
        storageKey,
        data: { field1: "value1", field2: "value2" },
        walletAddress,
        interval: 5000,
      })
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    const saved = localStorage.getItem(storageKey);
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.data.field1).toBe("value1");
    expect(parsed.walletAddress).toBe(walletAddress);
  });

  it("does not save empty data", () => {
    renderHook(() =>
      useFormAutoSave({
        storageKey,
        data: { field1: "", field2: "" },
        walletAddress,
      })
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("detects existing saved data on mount", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        walletAddress,
        data: { field1: "saved" },
        timestamp: new Date().toISOString(),
      })
    );

    const { result } = renderHook(() =>
      useFormAutoSave({
        storageKey,
        data: { field1: "" },
        walletAddress,
      })
    );

    expect(result.current.hasSavedData).toBe(true);
  });

  it("restores saved data", () => {
    const savedData = { field1: "restored", field2: "data" };
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        walletAddress,
        data: savedData,
        timestamp: new Date().toISOString(),
      })
    );

    const { result } = renderHook(() =>
      useFormAutoSave({
        storageKey,
        data: { field1: "", field2: "" },
        walletAddress,
      })
    );

    const restored = result.current.restoreSavedData();
    expect(restored).toEqual(savedData);
    expect(result.current.hasSavedData).toBe(false);
  });

  it("clears saved data", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        walletAddress,
        data: { field1: "value" },
        timestamp: new Date().toISOString(),
      })
    );

    const { result } = renderHook(() =>
      useFormAutoSave({
        storageKey,
        data: { field1: "value" },
        walletAddress,
      })
    );

    act(() => {
      result.current.clearSavedData();
    });

    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(result.current.hasSavedData).toBe(false);
  });

  it("updates lastSaved timestamp", () => {
    const { result } = renderHook(() =>
      useFormAutoSave({
        storageKey,
        data: { field1: "value" },
        walletAddress,
        interval: 5000,
      })
    );

    expect(result.current.lastSaved).toBeNull();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it("respects enabled flag", () => {
    renderHook(() =>
      useFormAutoSave({
        storageKey,
        data: { field1: "value" },
        walletAddress,
        enabled: false,
      })
    );

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("only restores data for matching wallet address", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        walletAddress: "DIFFERENT_ADDRESS",
        data: { field1: "value" },
        timestamp: new Date().toISOString(),
      })
    );

    const { result } = renderHook(() =>
      useFormAutoSave({
        storageKey,
        data: { field1: "" },
        walletAddress,
      })
    );

    expect(result.current.hasSavedData).toBe(false);
    const restored = result.current.restoreSavedData();
    expect(restored).toBeNull();
  });

  it("handles invalid JSON gracefully", () => {
    localStorage.setItem(storageKey, "invalid json");

    const { result } = renderHook(() =>
      useFormAutoSave({
        storageKey,
        data: { field1: "" },
        walletAddress,
      })
    );

    expect(result.current.hasSavedData).toBe(false);
  });

  it("saves data with updated values", () => {
    const { rerender } = renderHook(
      ({ data }) =>
        useFormAutoSave({
          storageKey,
          data,
          walletAddress,
          interval: 5000,
        }),
      {
        initialProps: { data: { field1: "initial" } },
      }
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    let saved = JSON.parse(localStorage.getItem(storageKey)!);
    expect(saved.data.field1).toBe("initial");

    rerender({ data: { field1: "updated" } });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    saved = JSON.parse(localStorage.getItem(storageKey)!);
    expect(saved.data.field1).toBe("updated");
  });
});
