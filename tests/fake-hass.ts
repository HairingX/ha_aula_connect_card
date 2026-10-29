/**
 * A fake `hass` with a fake websocket connection, for testing the card without Home Assistant.
 *
 * @packageDocumentation
 */

import { vi } from "vitest";

import type { Child, ConnectionEvent, HomeAssistant, Unsubscribe } from "../src/core/types.ts";

/** A subscription the card made. */
export interface FakeSubscription {
  /** The message subscribed with. */
  message: Record<string, unknown>;
  /** The options subscribed with. */
  options: { resubscribe?: boolean } | undefined;
  /** Sends the card an event. */
  callback: (message: unknown) => void;
  /** Ends the subscription. */
  unsubscribe: ReturnType<typeof vi.fn<Unsubscribe>>;
}

/** A websocket connection that records subscriptions and can send events and connection states. */
export class FakeConnection {
  /** Every subscription made, in order. */
  readonly subscriptions: FakeSubscription[] = [];
  /** The listeners of each connection event. */
  readonly listeners = new Map<ConnectionEvent, Set<() => void>>();
  /** The error the next subscriptions are refused with, if any. */
  refuse: Error | undefined = undefined;

  /** Records a subscription, or refuses it with `refuse`. */
  subscribeMessage(
    callback: (message: unknown) => void,
    message: Record<string, unknown>,
    options?: { resubscribe?: boolean },
  ): Promise<Unsubscribe> {
    if (this.refuse !== undefined) return Promise.reject(this.refuse);
    const unsubscribe = vi.fn<Unsubscribe>(() => Promise.resolve());
    this.subscriptions.push({ message, options, callback, unsubscribe });
    return Promise.resolve(unsubscribe);
  }

  /** Adds a listener of a connection event. */
  addEventListener(event: ConnectionEvent, callback: () => void): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(callback);
    this.listeners.set(event, set);
  }

  /** Removes a listener of a connection event. */
  removeEventListener(event: ConnectionEvent, callback: () => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  /** Calls the listeners of a connection event. */
  emit(event: ConnectionEvent): void {
    for (const callback of this.listeners.get(event) ?? []) callback();
  }

  /** The subscriptions not yet ended. */
  get active(): FakeSubscription[] {
    return this.subscriptions.filter((item) => item.unsubscribe.mock.calls.length === 0);
  }
}

/** Options of a fake `hass`. */
export interface FakeHassOptions {
  /** The language, Danish by default. */
  language?: string;
  /** The children `aula_connect/children` lists. */
  children?: Child[];
  /** The error `aula_connect/children` is refused with, if any. */
  childrenError?: Error;
  /** The connection; a new one by default. */
  connection?: FakeConnection;
  /**
   * Display preferences besides the defaults; Home Assistant also gives the user's first weekday,
   * which the card does not use.
   */
  locale?: Partial<HomeAssistant["locale"]> & { first_weekday?: string };
  /** Home Assistant's time zone, Copenhagen's by default. */
  timeZone?: string;
}

/** A fake `hass`, its connection and its `callWS`. */
export type FakeHass = HomeAssistant & {
  connection: FakeConnection;
  callWS: ReturnType<typeof vi.fn<(message: Record<string, unknown>) => Promise<unknown>>>;
};

/** Returns a fake `hass` in Danish with times in Copenhagen's time zone unless told otherwise. */
export function fakeHass(options: FakeHassOptions = {}): FakeHass {
  const language = options.language ?? "da";
  const connection = options.connection ?? new FakeConnection();
  const callWS = vi.fn((message: Record<string, unknown>): Promise<unknown> => {
    if (message.type !== "aula_connect/children") {
      return Promise.reject(new Error("unexpected command"));
    }
    if (options.childrenError !== undefined) {
      return Promise.reject(options.childrenError);
    }
    return Promise.resolve({ children: options.children ?? [] });
  });
  return {
    language,
    locale: {
      language,
      time_format: "language",
      time_zone: "server",
      ...options.locale,
    },
    config: { time_zone: options.timeZone ?? "Europe/Copenhagen" },
    connection,
    callWS,
  } as FakeHass;
}

/**
 * Returns an error as Home Assistant's websocket API rejects a command with: it gives a plain
 * object with a code and a message, made an Error here only to be thrown.
 */
export function wsError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

/** Lets pending promises, and the card's updates they cause, run; timers may be fake. */
export async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

/** Returns a value that a test knows is there, failing the test when it is not. */
export function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("expected a value");
  return value;
}
