/**
 * The data every card on a page shares: one store per websocket connection lists the children
 * and holds one subscription per child for this week and next, whatever the number of cards and
 * previews that show the child. Data is kept in memory only, never in the browser's storage, as a
 * shared screen must not keep a child's data.
 *
 * @packageDocumentation
 */

import { errorCode, fetchChildren, subscribeWeek } from "./api.ts";
import { selectChildren } from "./children.ts";
import { addDays, localTime, startOfWeek, timeZone } from "./dates.ts";
import { rememberChildren, rememberSubjects } from "./memory.ts";
import {
  childKey,
  type CallWS,
  type Child,
  type ChildKey,
  type Day,
  type DayRange,
  type HassConnection,
  type HomeAssistant,
  type Unsubscribe,
  type WeekData,
} from "./types.ts";

/** The days a store subscribes for: this week and next. */
export const RANGE_DAYS = 14;

/** How long a subscription no card wants is kept, for the editor's preview and view switches. */
export const LINGER_MS = 60_000;

/** How long after the integration ends a subscription the children are listed again. */
export const RELOAD_DELAY_MS = 3_000;

/** The waits before each new listing while one fails or lacks a child; the last repeats. */
export const RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 30_000, 60_000];

/** How long listings follow `RETRY_DELAYS_MS` before an error shows and missing children drop. */
export const RETRY_WINDOW_MS = 600_000;

/** The wait between listings once the window is over: they go on while a card watches. */
export const RETRY_SLOW_MS = 300_000;

/**
 * How long an unknown command waits before it shows, while there is nothing else to show:
 * Home Assistant answers so until the integration has loaded at a start.
 */
export const STARTING_MS = 30_000;

/** Returns the days a store subscribes for on `today`: from the Monday of its week, 14 days. */
export function rangeFor(today: Day): DayRange {
  const start = startOfWeek(today);
  return { start, end: addDays(start, RANGE_DAYS) };
}

/** The children Aula Connect lists. */
export interface ChildrenState {
  /** The children, once listed; a child listed before stays while listings are retried. */
  readonly list: readonly Child[] | undefined;
  /** Why the children could not be listed, when there is nothing to show or retries are over. */
  readonly error: unknown;
  /** Whether the store is listing the children again, as after an entry was reloaded. */
  readonly refreshing: boolean;
}

/** A child's data. */
export interface ChildData {
  /** The range last subscribed for. */
  readonly range: DayRange;
  /** The last data; its own `start` and `end` say which days it covers. */
  readonly data: WeekData | undefined;
  /** Why the subscription was refused. */
  readonly error: unknown;
  /** Whether the data is being renewed. */
  readonly stale: boolean;
}

/** What a store holds at one moment; a new one is made at every change. */
export interface StoreSnapshot {
  /** The days subscribed for. */
  readonly range: DayRange;
  /** The children. */
  readonly children: ChildrenState;
  /** Each child's data, by its key. */
  readonly data: ReadonlyMap<ChildKey, ChildData>;
}

/** What a card watches. */
export interface WatchOptions {
  /** The child ids the card shows; every child when empty. */
  readonly children: readonly number[];
  /** Called, once per microtask at most, when the snapshot has changed. */
  readonly onChange: () => void;
}

interface Watcher {
  /** The child ids wanted; null for none, when only the list is wanted. */
  readonly children: readonly number[] | null;
  readonly onChange: () => void;
}

interface Subscription {
  readonly range: DayRange;
  /** False once the subscription ended, was replaced or was lost: nothing of it counts then. */
  alive: boolean;
  /** Whether it was refused; it is made again only after the children are listed again. */
  failed: boolean;
  unsubscribe: Promise<Unsubscribe | undefined>;
  linger: ReturnType<typeof setTimeout> | undefined;
}

function sameRange(a: DayRange, b: DayRange): boolean {
  return a.start === b.start && a.end === b.end;
}

/** The data of one websocket connection, shared by every card on the page. */
export class AulaStore {
  readonly #connection: HassConnection;
  #callWS: CallWS;
  #zone: string;
  #range: DayRange;
  readonly #watchers = new Set<Watcher>();
  readonly #subscriptions = new Map<ChildKey, Subscription>();
  readonly #data = new Map<ChildKey, ChildData>();
  #list: Child[] | undefined;
  #listError: unknown;
  #refreshing = false;
  /** Whether the list was confirmed since the connection or a subscription was last lost. */
  #listed = true;
  /** Whether the last listing failed. */
  #listFailed = false;
  /** Children an earlier listing had and the last lacks: kept for the window, awaited after it. */
  readonly #missing = new Map<ChildKey, Child>();
  /** Children whose subscription was refused, until data comes for them. */
  readonly #refused = new Set<ChildKey>();
  /** Counts listings, so that the answer of one replaced by a newer is ignored. */
  #listing = 0;
  /** When the listings began to retry, for the window. */
  #retryStart: number | undefined;
  #retries = 0;
  #retryTimer: ReturnType<typeof setTimeout> | undefined;
  #reloadTimer: ReturnType<typeof setTimeout> | undefined;
  #attached = false;
  #snapshotCache: StoreSnapshot | undefined;
  #notifying = false;

  /** Makes the store of `connection`, sending commands with `callWS` and keeping days in `zone`. */
  constructor(connection: HassConnection, callWS: CallWS, zone: string) {
    this.#connection = connection;
    this.#callWS = callWS;
    this.#zone = zone;
    this.#range = rangeFor(localTime(new Date(), zone).day);
  }

  /** What the store holds now; the same object until something changes. */
  get snapshot(): StoreSnapshot {
    this.#snapshotCache ??= {
      range: this.#range,
      children: { list: this.#list, error: this.#listError, refreshing: this.#refreshing },
      data: new Map(this.#data),
    };
    return this.#snapshotCache;
  }

  /** Takes the newest `callWS` and the time zone days are kept in. */
  configure(callWS: CallWS, zone: string): void {
    this.#callWS = callWS;
    if (zone === this.#zone) return;
    this.#zone = zone;
    this.touch(new Date());
  }

  /** Moves the range to this week and next as of `now`, subscribing anew when it changed. */
  touch(now: Date): void {
    const range = rangeFor(localTime(now, this.#zone).day);
    if (sameRange(range, this.#range)) return;
    this.#range = range;
    this.#changed();
    this.#reconcile();
  }

  /**
   * Watches the children a card shows until the returned function is called. The first watcher
   * of an idle store lists the children; a child's subscription outlives its last watcher by
   * `LINGER_MS`, so a card made again at once finds its data.
   */
  watch(options: WatchOptions): () => void {
    return this.#add({ children: [...options.children], onChange: options.onChange });
  }

  /**
   * Resolves once the children are listed, or after `timeout` milliseconds, without wanting any
   * child's data: for the editor, which lists the children the cards have seen.
   */
  whenListed(timeout: number): Promise<void> {
    if (this.#list !== undefined) return Promise.resolve();
    return new Promise((resolve) => {
      const done = (): void => {
        clearTimeout(timer);
        release();
        resolve();
      };
      const timer = setTimeout(done, timeout);
      const release = this.#add({
        children: null,
        onChange: () => {
          if (this.#list !== undefined || this.#listError !== undefined) done();
        },
      });
    });
  }

  #add(watcher: Watcher): () => void {
    const idle = this.#idle();
    this.#watchers.add(watcher);
    if (idle) {
      this.#attach();
      this.touch(new Date());
      // Listed again on waking: the integration may have been reloaded while nothing watched.
      this.#listChildren();
    } else this.#retry();
    this.#reconcile();
    let watching = true;
    return () => {
      if (!watching) return;
      watching = false;
      this.#watchers.delete(watcher);
      this.#reconcile();
    };
  }

  #idle(): boolean {
    return this.#watchers.size === 0 && this.#subscriptions.size === 0;
  }

  #changed(): void {
    this.#snapshotCache = undefined;
    if (this.#notifying) return;
    this.#notifying = true;
    queueMicrotask(() => {
      this.#notifying = false;
      for (const watcher of [...this.#watchers]) watcher.onChange();
    });
  }

  #attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.#connection.addEventListener("ready", this.#onReady);
    this.#connection.addEventListener("disconnected", this.#onDisconnected);
  }

  #detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.#connection.removeEventListener("ready", this.#onReady);
    this.#connection.removeEventListener("disconnected", this.#onDisconnected);
    clearTimeout(this.#retryTimer);
    clearTimeout(this.#reloadTimer);
    this.#retryTimer = undefined;
    this.#reloadTimer = undefined;
    this.#stopRetrying();
    this.#listing++;
  }

  // Home Assistant drops every subscription of a lost connection; they are made again once the
  // children are listed again, as the integration may have been reloaded meanwhile.
  readonly #onReady = (): void => {
    this.#listChildren();
  };

  readonly #onDisconnected = (): void => {
    for (const [key, subscription] of this.#subscriptions) {
      subscription.alive = false;
      clearTimeout(subscription.linger);
      this.#markStale(key);
    }
    this.#subscriptions.clear();
    this.#listed = false;
    if (this.#idle()) this.#detach();
  };

  #markStale(key: ChildKey): void {
    const current = this.#data.get(key);
    if (!current || current.stale) return;
    this.#data.set(key, { ...current, stale: true });
    this.#changed();
  }

  #wanted(): Map<ChildKey, Child> {
    const result = new Map<ChildKey, Child>();
    if (!this.#list) return result;
    for (const watcher of this.#watchers) {
      if (!watcher.children) continue;
      for (const child of selectChildren(this.#list, watcher.children).shown) {
        result.set(childKey(child), child);
      }
    }
    return result;
  }

  /** Brings the subscriptions in line with what the watchers want and the range. */
  #reconcile(): void {
    const wanted = this.#wanted();
    for (const [key, child] of wanted) {
      const current = this.#subscriptions.get(key);
      if (current && sameRange(current.range, this.#range)) {
        clearTimeout(current.linger);
        current.linger = undefined;
        continue;
      }
      if (current) this.#end(key, current);
      if (this.#listed && !this.#missing.has(key)) this.#subscribe(key, child);
    }
    for (const [key, subscription] of this.#subscriptions) {
      if (wanted.has(key)) continue;
      if (!sameRange(subscription.range, this.#range)) this.#end(key, subscription);
      else
        subscription.linger ??= setTimeout(() => {
          this.#end(key, subscription);
          if (this.#idle()) this.#detach();
        }, LINGER_MS);
    }
    if (this.#idle()) this.#detach();
  }

  #subscribe(key: ChildKey, child: Child): void {
    const range = this.#range;
    const subscription: Subscription = {
      range,
      alive: true,
      failed: false,
      unsubscribe: Promise.resolve(undefined),
      linger: undefined,
    };
    this.#subscriptions.set(key, subscription);
    this.#markStale(key);
    subscription.unsubscribe = subscribeWeek(
      this.#connection,
      child,
      range,
      (data) => {
        if (!subscription.alive) return;
        rememberSubjects(
          data.lessons.map((lesson) => lesson.title),
          data.tasks.map((task) => task.subject),
        );
        this.#data.set(key, { range, data, error: undefined, stale: false });
        this.#changed();
        if (this.#refused.delete(key)) this.#retry();
      },
      () => {
        this.#ended(key, subscription);
      },
    ).catch((error: unknown) => {
      if (subscription.alive) {
        subscription.alive = false;
        subscription.failed = true;
        const current = this.#data.get(key);
        this.#data.set(key, {
          range,
          data: current?.data,
          error,
          stale: current?.data !== undefined,
        });
        this.#refused.add(key);
        this.#changed();
        // A refused subscription is made again after the next listing.
        this.#retry();
      }
      return undefined;
    });
  }

  #end(key: ChildKey, subscription: Subscription): void {
    subscription.alive = false;
    clearTimeout(subscription.linger);
    subscription.linger = undefined;
    if (this.#subscriptions.get(key) === subscription) this.#subscriptions.delete(key);
    // An unsubscribe that fails, or of a subscription that was never made, changes nothing.
    void subscription.unsubscribe.then((unsubscribe) => unsubscribe?.()).catch(() => undefined);
    this.#markStale(key);
  }

  // The integration ends a subscription when its entry is unloaded, as for a reload, or when Aula
  // no longer lists the child. The children are listed once the last of an entry's children has
  // ended and the entry has had a moment to come back.
  #ended(key: ChildKey, subscription: Subscription): void {
    if (!subscription.alive) return;
    this.#end(key, subscription);
    this.#refreshing = true;
    this.#listed = false;
    this.#changed();
    clearTimeout(this.#reloadTimer);
    this.#reloadTimer = setTimeout(() => {
      this.#reloadTimer = undefined;
      this.#listChildren();
    }, RELOAD_DELAY_MS);
  }

  #listChildren(): void {
    const listing = ++this.#listing;
    clearTimeout(this.#retryTimer);
    this.#retryTimer = undefined;
    fetchChildren(this.#callWS).then(
      (children) => {
        if (listing === this.#listing) this.#onListed(children);
      },
      (error: unknown) => {
        if (listing === this.#listing) this.#onListFailed(error);
      },
    );
  }

  /** Tells whether a card wants a child id the list lacks, as an entry not loaded yet has. */
  #lacking(list: readonly Child[]): boolean {
    return [...this.#watchers].some(
      (watcher) => selectChildren(list, watcher.children ?? []).missing.length > 0,
    );
  }

  /**
   * Tells whether something a card waits for is missing: the last listing failed, lacked a child
   * listed before or one a card names, or listed none, or a wanted child's subscription was
   * refused.
   */
  #unresolved(): boolean {
    const list = this.#list ?? [];
    if (this.#listFailed || this.#missing.size > 0 || list.length === 0 || this.#lacking(list))
      return true;
    const wanted = this.#wanted();
    return [...this.#refused].some((key) => wanted.has(key));
  }

  /** Tells whether the window is open; it opens when listings begin to retry. */
  #inWindow(): boolean {
    const now = Date.now();
    this.#retryStart ??= now;
    return now - this.#retryStart < RETRY_WINDOW_MS;
  }

  // While a card watches, a listing follows until nothing is missing: quickly for the window,
  // then every few minutes, as an entry can load long after Home Assistant has started.
  #retry(): void {
    if (this.#watchers.size === 0 || !this.#unresolved()) {
      clearTimeout(this.#retryTimer);
      this.#retryTimer = undefined;
      this.#stopRetrying();
      return;
    }
    if (this.#retryTimer !== undefined) return;
    const delay = this.#inWindow()
      ? RETRY_DELAYS_MS[Math.min(this.#retries, RETRY_DELAYS_MS.length - 1)]
      : RETRY_SLOW_MS;
    this.#retries++;
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = undefined;
      this.#listChildren();
    }, delay);
  }

  #stopRetrying(): void {
    this.#retryStart = undefined;
    this.#retries = 0;
  }

  // While Home Assistant starts, the integration answers with an empty list until its entry has
  // loaded, and an entry being reloaded lacks its children until it is back: a listing that
  // lacks a child listed before or named by a card, or that lists none, is retried, keeping what
  // was shown.
  #onListed(children: Child[]): void {
    rememberChildren(children);
    const keys = new Set(children.map(childKey));
    const before = [...(this.#list ?? []), ...this.#missing.values()];
    this.#listed = true;
    this.#listFailed = false;
    this.#listError = undefined;
    for (const [key, subscription] of this.#subscriptions) {
      if (subscription.failed) this.#subscriptions.delete(key);
    }
    this.#missing.clear();
    for (const child of before) {
      if (!keys.has(childKey(child))) this.#missing.set(childKey(child), child);
    }
    if (
      (this.#missing.size > 0 || children.length === 0 || this.#lacking(children)) &&
      this.#inWindow()
    ) {
      const kept = (this.#list ?? []).filter(
        (child) => keys.has(childKey(child)) || this.#missing.has(childKey(child)),
      );
      const known = new Set(kept.map(childKey));
      this.#list = [...kept, ...children.filter((child) => !known.has(childKey(child)))];
      this.#refreshing = true;
    } else {
      this.#list = children;
      this.#refreshing = false;
      for (const key of [...this.#data.keys()]) if (!keys.has(key)) this.#data.delete(key);
    }
    this.#changed();
    this.#reconcile();
    this.#retry();
  }

  #onListFailed(error: unknown): void {
    this.#listFailed = true;
    const inWindow = this.#inWindow();
    if (this.#list === undefined) {
      const starting =
        errorCode(error) === "unknown_command" &&
        Date.now() - (this.#retryStart ?? 0) < STARTING_MS;
      this.#listError = starting ? undefined : error;
      this.#refreshing = false;
    } else if (inWindow) {
      this.#listError = undefined;
      this.#refreshing = true;
    } else {
      this.#listError = error;
      this.#refreshing = false;
      this.#list = this.#list.filter((child) => !this.#missing.has(childKey(child)));
    }
    this.#changed();
    this.#retry();
  }
}

const stores = new WeakMap<HassConnection, AulaStore>();

/**
 * Returns the store of `hass`'s connection, made on first use, configured with `hass`'s
 * `callWS` and the time zone the user sees times in.
 */
export function storeFor(hass: HomeAssistant): AulaStore {
  const callWS: CallWS = (message) => hass.callWS(message);
  const zone = timeZone(hass);
  let store = stores.get(hass.connection);
  if (store) store.configure(callWS, zone);
  else {
    store = new AulaStore(hass.connection, callWS, zone);
    stores.set(hass.connection, store);
  }
  return store;
}
