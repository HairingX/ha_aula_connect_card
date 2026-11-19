import { afterEach, describe, expect, it, vi } from "vitest";

import { Loads } from "../../src/ui/loads.ts";
import { navigate, viewPath } from "../../src/ui/navigate.ts";
import { settle } from "../fake-hass.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("going to another view", () => {
  it("goes to a view of the dashboard shown, or to an address as it is", () => {
    expect(viewPath("lektier", "/aula/aula")).toBe("/aula/lektier");
    expect(viewPath("lektier", "/")).toBe("/lovelace/lektier");
    expect(viewPath("/other/view", "/aula/aula")).toBe("/other/view");
  });

  it("tells Home Assistant the address changed", () => {
    history.replaceState(null, "", "/aula/aula");
    const heard = vi.fn();
    window.addEventListener("location-changed", heard);
    navigate("uge");
    window.removeEventListener("location-changed", heard);
    expect(location.pathname).toBe("/aula/uge");
    expect(heard).toHaveBeenCalledOnce();
    expect((heard.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ replace: false });
  });
});

describe("the answers a card asks for", () => {
  it("asks once per version, keeping what came while it asks again", async () => {
    const changed = vi.fn();
    const loads = new Loads<number>(changed);
    const fetch = vi.fn(() => Promise.resolve(1));
    expect(loads.get("a", "1", fetch)).toMatchObject({ data: undefined, loading: true });
    await settle();
    expect(loads.get("a", "1", fetch)).toMatchObject({
      data: 1,
      error: undefined,
      loading: false,
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalledOnce();
    expect(loads.get("a", "2", () => Promise.resolve(2))).toMatchObject({ data: 1, loading: true });
    await settle();
    expect(loads.get("a", "2", fetch).data).toBe(2);
  });

  it("keeps why a request failed, and asks again when refreshed", async () => {
    const changed = vi.fn();
    const loads = new Loads<number>(changed);
    const error = new Error("down");
    loads.get("a", "1", () => Promise.reject(error));
    await settle();
    expect(loads.get("a", "1", () => Promise.resolve(3))).toMatchObject({ error, loading: false });
    loads.refresh();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(loads.get("a", "1", () => Promise.resolve(3))).toMatchObject({ loading: true });
    await settle();
    expect(loads.get("a", "1", () => Promise.resolve(4)).data).toBe(3);
  });

  it("ignores an answer to a request asked again since", async () => {
    const changed = vi.fn();
    const loads = new Loads<number>(changed);
    let first: (value: number) => void = () => undefined;
    let fail: (error: Error) => void = () => undefined;
    loads.get("a", "1", () => new Promise((resolve) => (first = resolve)));
    loads.get("b", "1", () => new Promise((_resolve, reject) => (fail = reject)));
    loads.get("a", "2", () => Promise.resolve(2));
    loads.get("b", "2", () => Promise.resolve(2));
    await settle();
    first(1);
    fail(new Error("late"));
    await settle();
    expect(loads.get("a", "2", () => Promise.resolve(9))).toMatchObject({
      data: 2,
      error: undefined,
    });
    expect(loads.get("b", "2", () => Promise.resolve(9))).toMatchObject({
      data: 2,
      error: undefined,
    });
    expect(changed).toHaveBeenCalledTimes(2);
  });
});
