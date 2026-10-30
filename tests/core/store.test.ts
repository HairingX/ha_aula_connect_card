import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { knownChildren, forget } from "../../src/core/memory.ts";
import {
  LINGER_MS,
  RELOAD_DELAY_MS,
  RETRY_DELAYS_MS,
  RETRY_SLOW_MS,
  RETRY_WINDOW_MS,
  STARTING_MS,
  rangeFor,
  storeFor,
  type AulaStore,
} from "../../src/core/store.ts";
import type { Child, Unsubscribe, WeekData } from "../../src/core/types.ts";
import { FakeConnection, fakeHass, present, settle, wsError, type FakeHass } from "../fake-hass.ts";
import { CHILDREN, weekData } from "../fixtures/week.ts";

// Thursday of week 44, 2026.
const NOW = "2026-10-29T10:05:00+01:00";
const IDA = present(CHILDREN[0]);
const OSKAR = present(CHILDREN[1]);
const IDA_KEY = "entry-a/1001";
// The longest wait between two listings: the window ends at the first listing after it.
const RETRY_MAX_MS = Math.max(...RETRY_DELAYS_MS);

interface Setup {
  connection: FakeConnection;
  hass: FakeHass;
  store: AulaStore;
  /** What `aula_connect/children` answers next: the children, or an error to reject with. */
  answer: (reply: Child[] | Error) => void;
}

function setup(children: Child[] = CHILDREN): Setup {
  const connection = new FakeConnection();
  const hass = fakeHass({ connection });
  let reply: Child[] | Error = children;
  hass.callWS.mockImplementation(() =>
    reply instanceof Error ? Promise.reject(reply) : Promise.resolve({ children: reply }),
  );
  return {
    connection,
    hass,
    store: storeFor(hass),
    answer: (next) => {
      reply = next;
    },
  };
}

function data(fields: Partial<WeekData> = {}): WeekData {
  return { ...weekData("2026-10-26"), ...fields };
}

function subscribedIds(connection: FakeConnection): unknown[] {
  return connection.active.map((item) => item.message.child_id);
}

function listeners(connection: FakeConnection): number {
  return [...connection.listeners.values()].reduce((sum, set) => sum + set.size, 0);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  forget();
  vi.useRealTimers();
});

describe("the range", () => {
  it("is the Monday of today's week and the 14 days from it", () => {
    expect(rangeFor("2026-10-29")).toEqual({ start: "2026-10-26", end: "2026-11-09" });
    expect(rangeFor("2026-11-01")).toEqual({ start: "2026-10-26", end: "2026-11-09" });
    expect(rangeFor("2026-11-02")).toEqual({ start: "2026-11-02", end: "2026-11-16" });
  });
});

describe("watching", () => {
  it("lists the children once and subscribes once per child for every card and preview", async () => {
    const { connection, hass, store } = setup();
    const onChange = vi.fn();
    store.watch({ children: [], onChange });
    store.watch({ children: [1001], onChange });
    store.watch({ children: [1002, 1001], onChange });
    store.watch({ children: [], onChange });
    await settle();
    expect(hass.callWS).toHaveBeenCalledTimes(1);
    expect(subscribedIds(connection)).toEqual([1001, 1002]);
    expect(connection.active[0]?.message).toEqual({
      type: "aula_connect/week/subscribe",
      entry_id: "entry-a",
      child_id: 1001,
      start: "2026-10-26",
      end: "2026-11-09",
    });
    expect(knownChildren()).toEqual(CHILDREN);
  });

  it("subscribes a child listed by two entries once, from the first", async () => {
    const twice = { ...IDA, entry_id: "entry-b" };
    const { connection, store } = setup([IDA, twice]);
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    expect(connection.active.map((item) => item.message.entry_id)).toEqual(["entry-a"]);
  });

  it("subscribes only the children the cards want", async () => {
    const { connection, store } = setup();
    store.watch({ children: [1002], onChange: vi.fn() });
    await settle();
    expect(subscribedIds(connection)).toEqual([1002]);
  });

  it("gives a watcher the data the store already has at once", async () => {
    const { connection, store } = setup();
    const release = store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    const week = data();
    connection.subscriptions[0]?.callback(week);
    release();
    store.watch({ children: [1001], onChange: vi.fn() });
    expect(store.snapshot.data.get(IDA_KEY)).toMatchObject({ data: week, stale: false });
    expect(connection.subscriptions).toHaveLength(1);
  });

  it("tells each watcher of changes once per microtask, with a new snapshot", async () => {
    const { connection, store } = setup();
    const onChange = vi.fn();
    store.watch({ children: [], onChange });
    await settle();
    onChange.mockClear();
    const before = store.snapshot;
    expect(store.snapshot).toBe(before);
    connection.subscriptions[0]?.callback(data());
    connection.subscriptions[1]?.callback(data());
    expect(onChange).not.toHaveBeenCalled();
    await settle();
    expect(onChange).toHaveBeenCalledOnce();
    expect(store.snapshot).not.toBe(before);
  });

  it("keeps a subscription when a card is made again in the same task", async () => {
    const { connection, store } = setup();
    const release = store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    release();
    store.watch({ children: [1001], onChange: vi.fn() });
    await vi.advanceTimersByTimeAsync(LINGER_MS * 2);
    expect(connection.subscriptions).toHaveLength(1);
    expect(connection.active).toHaveLength(1);
  });

  it("ends a subscription no card wants after LINGER_MS, and then holds nothing", async () => {
    const { connection, hass, store } = setup();
    const release = store.watch({ children: [], onChange: vi.fn() });
    await settle();
    release();
    release();
    await vi.advanceTimersByTimeAsync(LINGER_MS - 1);
    expect(connection.active).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(connection.active).toHaveLength(0);
    expect(listeners(connection)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    // Woken again, it lists the children anew: the integration may have been reloaded meanwhile.
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(connection.active).toHaveLength(2);
  });

  it("follows a card that shows other children", async () => {
    const { connection, store } = setup();
    const release = store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    store.watch({ children: [1002], onChange: vi.fn() });
    release();
    expect(subscribedIds(connection)).toEqual([1001, 1002]);
    await vi.advanceTimersByTimeAsync(LINGER_MS);
    expect(subscribedIds(connection)).toEqual([1002]);
  });

  it("subscribes for the new range at Monday 00:00, keeping the old data stale", async () => {
    const { connection, store } = setup();
    store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    const old = data();
    connection.subscriptions[0]?.callback(old);
    vi.setSystemTime(new Date("2026-11-02T00:00:00.050+01:00"));
    store.touch(new Date());
    await settle();
    expect(connection.subscriptions[0]?.unsubscribe).toHaveBeenCalledOnce();
    expect(connection.active.map((item) => item.message.start)).toEqual(["2026-11-02"]);
    expect(store.snapshot.range).toEqual({ start: "2026-11-02", end: "2026-11-16" });
    expect(store.snapshot.data.get(IDA_KEY)).toMatchObject({ data: old, stale: true });
    // The old subscription's events count no more.
    connection.subscriptions[0]?.callback(data({ lessons: [] }));
    expect(store.snapshot.data.get(IDA_KEY)?.data).toEqual(old);
    const fresh = weekData("2026-11-02");
    connection.subscriptions[1]?.callback(fresh);
    expect(store.snapshot.data.get(IDA_KEY)).toMatchObject({ data: fresh, stale: false });
  });

  it("ends an unwanted subscription of an old range at once", async () => {
    const { connection, store } = setup();
    const release = store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    release();
    vi.setSystemTime(new Date("2026-11-02T08:00:00+01:00"));
    store.touch(new Date());
    await settle();
    expect(connection.active).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps days in the time zone times are shown in", async () => {
    // Monday 2 November 03:00 in Copenhagen is still Sunday evening in New York.
    vi.setSystemTime(new Date("2026-11-02T03:00:00+01:00"));
    const { connection, hass, store } = setup();
    store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    expect(connection.active[0]?.message.start).toBe("2026-11-02");
    hass.config.time_zone = "America/New_York";
    expect(storeFor(hass)).toBe(store);
    await settle();
    expect(connection.active.map((item) => item.message.start)).toEqual(["2026-10-26"]);
  });
});

describe("the connection", () => {
  it("lists again and subscribes anew after a reconnect, never unsubscribing the lost", async () => {
    const { connection, hass, store } = setup();
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    const week = data();
    connection.subscriptions[0]?.callback(week);
    connection.emit("disconnected");
    expect(store.snapshot.data.get(IDA_KEY)).toMatchObject({ data: week, stale: true });
    // A tick while the connection is down subscribes nothing.
    store.touch(new Date());
    expect(connection.subscriptions).toHaveLength(2);
    connection.subscriptions[0]?.callback(data({ lessons: [] }));
    expect(store.snapshot.data.get(IDA_KEY)?.data).toEqual(week);
    connection.emit("ready");
    await settle();
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(connection.subscriptions).toHaveLength(4);
    expect(connection.subscriptions.every((item) => item.unsubscribe.mock.calls.length === 0)).toBe(
      true,
    );
  });

  it("lists once RELOAD_DELAY_MS after the last child of a reloaded entry ended", async () => {
    const { connection, hass, store } = setup();
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    connection.subscriptions[0]?.callback(data());
    connection.subscriptions[0]?.callback({ ended: true });
    await vi.advanceTimersByTimeAsync(RELOAD_DELAY_MS / 2);
    connection.subscriptions[1]?.callback({ ended: true });
    connection.subscriptions[1]?.callback({ ended: true });
    expect(store.snapshot.children.refreshing).toBe(true);
    expect(store.snapshot.data.get(IDA_KEY)?.stale).toBe(true);
    await vi.advanceTimersByTimeAsync(RELOAD_DELAY_MS - 1);
    expect(hass.callWS).toHaveBeenCalledTimes(1);
    expect(connection.subscriptions).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(subscribedIds(connection)).toEqual([1001, 1002]);
    expect(connection.subscriptions).toHaveLength(4);
    expect(store.snapshot.children.refreshing).toBe(false);
  });

  it("shows a refused subscription as the child's error, keeping its last data", async () => {
    const { connection, store } = setup();
    store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    const week = data();
    connection.subscriptions[0]?.callback(week);
    connection.refuse = wsError("not_found", "Child not found");
    vi.setSystemTime(new Date("2026-11-02T08:00:00+01:00"));
    store.touch(new Date());
    await settle();
    expect(store.snapshot.data.get(IDA_KEY)).toMatchObject({
      data: week,
      error: connection.refuse,
      stale: true,
    });
    // It is tried again only after the children are listed again.
    store.touch(new Date());
    expect(store.snapshot.data.get(IDA_KEY)?.error).toBe(connection.refuse);
  });

  it("keeps listing while a card wants a child whose subscription was refused", async () => {
    const { connection, hass, store } = setup();
    connection.refuse = wsError("not_found", "Child not found");
    store.watch({ children: [1001], onChange: vi.fn() });
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS + RETRY_SLOW_MS);
    const listings = hass.callWS.mock.calls.length;
    await vi.advanceTimersByTimeAsync(RETRY_SLOW_MS);
    expect(hass.callWS).toHaveBeenCalledTimes(listings + 1);
  });

  it("ignores a refusal that comes after the subscription was given up", async () => {
    const { connection, store } = setup();
    let refuse: (error: Error) => void = () => undefined;
    connection.subscribeMessage = vi.fn(
      () =>
        new Promise<Unsubscribe>((_resolve, reject) => {
          refuse = reject;
        }),
    );
    const release = store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    release();
    await vi.advanceTimersByTimeAsync(LINGER_MS);
    refuse(new Error("late"));
    await settle();
    expect(store.snapshot.data.get(IDA_KEY)).toBeUndefined();
  });

  it("swallows an unsubscribe that fails", async () => {
    const { connection, store } = setup();
    const release = store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    present(connection.subscriptions[0]).unsubscribe.mockRejectedValue(new Error("gone"));
    release();
    await vi.advanceTimersByTimeAsync(LINGER_MS);
    await settle();
    expect(connection.subscriptions[0]?.unsubscribe).toHaveBeenCalledOnce();
  });
});

describe("listing the children again", () => {
  it("shows a failing first listing at once, and keeps trying", async () => {
    const { connection, store, answer } = setup();
    const error = wsError("home_assistant_error", "Timeout");
    answer(error);
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    expect(store.snapshot.children).toEqual({ list: undefined, error, refreshing: false });
    answer(CHILDREN);
    await vi.advanceTimersByTimeAsync(present(RETRY_DELAYS_MS[0]));
    expect(store.snapshot.children).toEqual({
      list: CHILDREN,
      error: undefined,
      refreshing: false,
    });
    expect(subscribedIds(connection)).toEqual([1001, 1002]);
  });

  it("says the integration is not loaded only once Home Assistant has had time to start", async () => {
    const { store, answer } = setup();
    const error = wsError("unknown_command", "Unknown command.");
    answer(error);
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    expect(store.snapshot.children).toEqual({
      list: undefined,
      error: undefined,
      refreshing: false,
    });
    await vi.advanceTimersByTimeAsync(STARTING_MS);
    expect(store.snapshot.children.error).toBeUndefined();
    await vi.advanceTimersByTimeAsync(RETRY_MAX_MS);
    expect(store.snapshot.children).toEqual({ list: undefined, error, refreshing: false });
  });

  it("says it is refreshing, not that there are no children, while an empty list is retried", async () => {
    const { store, answer } = setup();
    answer([]);
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    expect(store.snapshot.children).toEqual({ list: [], error: undefined, refreshing: true });
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS + RETRY_MAX_MS);
    expect(store.snapshot.children).toEqual({ list: [], error: undefined, refreshing: false });
  });

  it("recovers after a Home Assistant restart: unknown command, then no children, then the children", async () => {
    const { connection, store, answer } = setup();
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    const week = data();
    connection.subscriptions[0]?.callback(week);
    connection.emit("disconnected");
    answer(wsError("unknown_command", "Unknown command."));
    connection.emit("ready");
    await settle();
    expect(store.snapshot.children).toEqual({ list: CHILDREN, error: undefined, refreshing: true });
    answer([]);
    await vi.advanceTimersByTimeAsync(present(RETRY_DELAYS_MS[0]));
    expect(store.snapshot.children).toEqual({ list: CHILDREN, error: undefined, refreshing: true });
    expect(connection.subscriptions).toHaveLength(2);
    expect(store.snapshot.data.get(IDA_KEY)).toMatchObject({ data: week, stale: true });
    answer(CHILDREN);
    await vi.advanceTimersByTimeAsync(present(RETRY_DELAYS_MS[1]));
    expect(store.snapshot.children).toEqual({
      list: CHILDREN,
      error: undefined,
      refreshing: false,
    });
    // The subscriptions the restart dropped are not ended; new ones are made.
    expect(connection.subscriptions.slice(2).map((item) => item.message.child_id)).toEqual([
      1001, 1002,
    ]);
  });

  it("keeps a child through an entry reload that takes more than RELOAD_DELAY_MS", async () => {
    const { connection, store, answer } = setup();
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    const week = data();
    connection.subscriptions[0]?.callback(week);
    connection.subscriptions[0]?.callback({ ended: true });
    connection.subscriptions[1]?.callback({ ended: true });
    answer([]);
    await vi.advanceTimersByTimeAsync(RELOAD_DELAY_MS);
    expect(store.snapshot.children.list).toEqual(CHILDREN);
    expect(store.snapshot.data.get(IDA_KEY)).toMatchObject({ data: week, stale: true });
    answer([OSKAR]);
    await vi.advanceTimersByTimeAsync(present(RETRY_DELAYS_MS[0]));
    expect(store.snapshot.children.list).toEqual(CHILDREN);
    expect(subscribedIds(connection)).toEqual([1002]);
    answer(CHILDREN);
    await vi.advanceTimersByTimeAsync(present(RETRY_DELAYS_MS[1]));
    expect(store.snapshot.children.refreshing).toBe(false);
    expect(subscribedIds(connection)).toEqual([1002, 1001]);
  });

  it("drops a child still missing when the window is over, and takes it back when it returns", async () => {
    const { connection, store, answer } = setup();
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    connection.subscriptions[0]?.callback(data());
    connection.subscriptions[0]?.callback({ ended: true });
    answer([OSKAR]);
    await vi.advanceTimersByTimeAsync(RELOAD_DELAY_MS);
    expect(store.snapshot.children.list).toEqual(CHILDREN);
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS + RETRY_MAX_MS);
    expect(store.snapshot.children).toEqual({ list: [OSKAR], error: undefined, refreshing: false });
    expect(store.snapshot.data.has(IDA_KEY)).toBe(false);
    answer(CHILDREN);
    await vi.advanceTimersByTimeAsync(RETRY_SLOW_MS);
    expect(store.snapshot.children.list).toEqual(CHILDREN);
    expect(subscribedIds(connection)).toContain(1001);
  });

  it("lists again for a child a card names that was never listed, as an entry still loading", async () => {
    const { connection, store, answer } = setup([IDA]);
    store.watch({ children: [1001, 1002], onChange: vi.fn() });
    await settle();
    expect(store.snapshot.children).toEqual({ list: [IDA], error: undefined, refreshing: true });
    answer(CHILDREN);
    await vi.advanceTimersByTimeAsync(present(RETRY_DELAYS_MS[0]));
    expect(store.snapshot.children.refreshing).toBe(false);
    expect(subscribedIds(connection)).toEqual([1001, 1002]);
  });

  it("keeps listing for a child a card names after the window, every few minutes", async () => {
    const { hass, store } = setup([IDA]);
    store.watch({ children: [1002], onChange: vi.fn() });
    await settle();
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS + RETRY_MAX_MS);
    expect(store.snapshot.children.refreshing).toBe(false);
    const listings = hass.callWS.mock.calls.length;
    await vi.advanceTimersByTimeAsync(RETRY_SLOW_MS);
    expect(hass.callWS).toHaveBeenCalledTimes(listings + 1);
  });

  it("recovers when the entry loads an hour after a restart", async () => {
    const { connection, hass, store, answer } = setup();
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    connection.emit("disconnected");
    answer([]);
    connection.emit("ready");
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(store.snapshot.children).toEqual({ list: [], error: undefined, refreshing: false });
    const listings = hass.callWS.mock.calls.length;
    await vi.advanceTimersByTimeAsync(RETRY_SLOW_MS);
    expect(hass.callWS).toHaveBeenCalledTimes(listings + 1);
    answer(CHILDREN);
    await vi.advanceTimersByTimeAsync(RETRY_SLOW_MS);
    expect(store.snapshot.children.list).toEqual(CHILDREN);
    // The subscriptions the restart dropped are not ended; new ones are made.
    expect(connection.subscriptions.slice(2).map((item) => item.message.child_id)).toEqual([
      1001, 1002,
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("tries a refused subscription again while a card wants it", async () => {
    const { connection, store } = setup();
    connection.refuse = wsError("home_assistant_error", "Not ready");
    store.watch({ children: [1001], onChange: vi.fn() });
    await settle();
    expect(store.snapshot.data.get(IDA_KEY)?.error).toBe(connection.refuse);
    connection.refuse = undefined;
    await vi.advanceTimersByTimeAsync(present(RETRY_DELAYS_MS[0]));
    expect(subscribedIds(connection)).toEqual([1001]);
    connection.active[0]?.callback(data());
    expect(store.snapshot.data.get(IDA_KEY)).toMatchObject({ error: undefined, stale: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lists the children for the editor without subscribing, or gives up waiting", async () => {
    const { connection, store } = setup();
    await store.whenListed(1_000);
    expect(store.snapshot.children.list).toEqual(CHILDREN);
    expect(connection.subscriptions).toHaveLength(0);
    await store.whenListed(1_000);
    const silent = setup();
    silent.hass.callWS.mockReturnValue(new Promise(() => undefined));
    const waiting = silent.store.whenListed(1_000);
    await vi.advanceTimersByTimeAsync(1_000);
    await waiting;
    expect(silent.store.snapshot.children.list).toBeUndefined();
  });

  it("shows the error and drops missing children when a listing still fails after the window", async () => {
    const { connection, store, answer } = setup();
    store.watch({ children: [], onChange: vi.fn() });
    await settle();
    connection.subscriptions[0]?.callback({ ended: true });
    answer([OSKAR]);
    await vi.advanceTimersByTimeAsync(RELOAD_DELAY_MS);
    const error = wsError("home_assistant_error", "Timeout");
    answer(error);
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS + RETRY_MAX_MS);
    expect(store.snapshot.children).toEqual({ list: [OSKAR], error, refreshing: false });
  });

  it("ignores the answer of a listing a newer one replaced", async () => {
    const { connection, hass, store } = setup();
    let first: (value: unknown) => void = () => undefined;
    hass.callWS.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          first = resolve;
        }),
    );
    store.watch({ children: [], onChange: vi.fn() });
    connection.emit("ready");
    await settle();
    first({ children: [] });
    await settle();
    expect(store.snapshot.children.list).toEqual(CHILDREN);
  });

  it("stops listing and retrying when it is idle", async () => {
    const { connection, store, answer } = setup();
    answer(wsError("unknown_command", "Unknown command."));
    const release = store.watch({ children: [], onChange: vi.fn() });
    await settle();
    release();
    expect(vi.getTimerCount()).toBe(0);
    expect(listeners(connection)).toBe(0);
  });
});
