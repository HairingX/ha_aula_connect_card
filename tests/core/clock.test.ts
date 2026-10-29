import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MINUTE_MS, TICK_DELAY_MS, onMinute } from "../../src/core/clock.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(new Date("2026-10-29T11:59:30+01:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the clock", () => {
  it("ticks just after each minute starts, so that the new minute is read", () => {
    const listener = vi.fn();
    const stop = onMinute(listener);
    vi.advanceTimersByTime(30_000 + TICK_DELAY_MS - 1);
    expect(listener).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(listener).toHaveBeenCalledWith(new Date("2026-10-29T12:00:00.050+01:00"));
    vi.advanceTimersByTime(MINUTE_MS);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it("serves every listener with one timer, and stops with the last", () => {
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = onMinute(first);
    const stopSecond = onMinute(second);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(MINUTE_MS);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    stopFirst();
    stopFirst();
    expect(vi.getTimerCount()).toBe(1);
    stopSecond();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ticks at once when the page is shown again, and not while it is hidden", () => {
    const listener = vi.fn();
    const stop = onMinute(listener);
    const state = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(listener).not.toHaveBeenCalled();
    state.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(listener).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(1);
    stop();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(listener).toHaveBeenCalledOnce();
  });
});
