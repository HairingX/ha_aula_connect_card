/**
 * The data every card on a page shares: one store per websocket connection lists the children
 * and holds one subscription per child for this week and next, whatever the number of cards and
 * previews that show the child. Data is kept in memory only, never in the browser's storage, as a
 * shared screen must not keep a child's data.
 *
 * @packageDocumentation
 */

import { fetchChildren, subscribeWeek } from "./api.ts";
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

/** How long listings are retried before an error shows and missing children are dropped. */
export const RETRY_WINDOW_MS = 600_000;

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
  readonly children: readonly number[];
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
  private readonly connection: HassConnection;
  private callWS: CallWS;
  private zone: string;
  private range: DayRange;
  private readonly watchers = new Set<Watcher>();
  private readonly subscriptions = new Map<ChildKey, Subscription>();
  private readonly data = new Map<ChildKey, ChildData>();
  private list: Child[] | undefined;
  private listError: unknown;
  private refreshing = false;
  /** Whether the list was confirmed since the connection or a subscription was last lost. */
  private listed = true;
  /** Children kept from an earlier listing while retries look for them again. */
  private readonly missing = new Set<ChildKey>();
  /** Counts listings, so that the answer of one replaced by a newer is ignored. */
  private listing = 0;
  private retryStart: number | undefined;
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private reloadTimer: ReturnType<typeof setTimeout> | undefined;
  private attached = false;
  private snapshotCache: StoreSnapshot | undefined;
  private notifying = false;

  /** Makes the store of `connection`, sending commands with `callWS` and keeping days in `zone`. */
  constructor(connection: HassConnection, callWS: CallWS, zone: string) {
    this.connection = connection;
    this.callWS = callWS;
    this.zone = zone;
    this.range = rangeFor(localTime(new Date(), zone).day);
  }

  /** What the store holds now; the same object until something changes. */
  get snapshot(): StoreSnapshot {
    this.snapshotCache ??= {
      range: this.range,
      children: { list: this.list, error: this.listError, refreshing: this.refreshing },
      data: new Map(this.data),
    };
    return this.snapshotCache;
  }

  /** Takes the newest `callWS` and the time zone days are kept in. */
  configure(callWS: CallWS, zone: string): void {
    this.callWS = callWS;
    if (zone === this.zone) return;
    this.zone = zone;
    this.touch(new Date());
  }

  /** Moves the range to this week and next as of `now`, subscribing anew when it changed. */
  touch(now: Date): void {
    const range = rangeFor(localTime(now, this.zone).day);
    if (sameRange(range, this.range)) return;
    this.range = range;
    this.changed();
    this.reconcile();
  }

  /**
   * Watches the children a card shows until the returned function is called. The first watcher
   * of an idle store lists the children; a child's subscription outlives its last watcher by
   * `LINGER_MS`, so a card made again at once finds its data.
   */
  watch(options: WatchOptions): () => void {
    const watcher: Watcher = { children: [...options.children], onChange: options.onChange };
    const idle = this.idle();
    this.watchers.add(watcher);
    if (idle) {
      this.attach();
      this.touch(new Date());
      // Listed again on waking: the integration may have been reloaded while nothing watched.
      this.listChildren();
    }
    this.reconcile();
    let watching = true;
    return () => {
      if (!watching) return;
      watching = false;
      this.watchers.delete(watcher);
      this.reconcile();
    };
  }

  private idle(): boolean {
    return this.watchers.size === 0 && this.subscriptions.size === 0;
  }

  private changed(): void {
    this.snapshotCache = undefined;
    if (this.notifying) return;
    this.notifying = true;
    queueMicrotask(() => {
      this.notifying = false;
      for (const watcher of [...this.watchers]) watcher.onChange();
    });
  }

  private attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.connection.addEventListener("ready", this.onReady);
    this.connection.addEventListener("disconnected", this.onDisconnected);
  }

  private detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.connection.removeEventListener("ready", this.onReady);
    this.connection.removeEventListener("disconnected", this.onDisconnected);
    clearTimeout(this.retryTimer);
    clearTimeout(this.reloadTimer);
    this.retryTimer = undefined;
    this.reloadTimer = undefined;
    this.retryStart = undefined;
    this.retries = 0;
    this.listing++;
  }

  // Home Assistant drops every subscription of a lost connection; they are made again once the
  // children are listed again, as the integration may have been reloaded meanwhile.
  private readonly onReady = (): void => {
    this.listChildren();
  };

  private readonly onDisconnected = (): void => {
    for (const [key, subscription] of this.subscriptions) {
      subscription.alive = false;
      clearTimeout(subscription.linger);
      this.markStale(key);
    }
    this.subscriptions.clear();
    this.listed = false;
    if (this.idle()) this.detach();
  };

  private markStale(key: ChildKey): void {
    const current = this.data.get(key);
    if (!current || current.stale) return;
    this.data.set(key, { ...current, stale: true });
    this.changed();
  }

  private wanted(): Map<ChildKey, Child> {
    const result = new Map<ChildKey, Child>();
    if (!this.list) return result;
    for (const watcher of this.watchers) {
      for (const child of selectChildren(this.list, watcher.children).shown) {
        result.set(childKey(child), child);
      }
    }
    return result;
  }

  /** Brings the subscriptions in line with what the watchers want and the range. */
  private reconcile(): void {
    const wanted = this.wanted();
    for (const [key, child] of wanted) {
      const current = this.subscriptions.get(key);
      if (current && sameRange(current.range, this.range)) {
        clearTimeout(current.linger);
        current.linger = undefined;
        continue;
      }
      if (current) this.end(key, current);
      if (this.listed && !this.missing.has(key)) this.subscribe(key, child);
    }
    for (const [key, subscription] of this.subscriptions) {
      if (wanted.has(key)) continue;
      if (!sameRange(subscription.range, this.range)) this.end(key, subscription);
      else
        subscription.linger ??= setTimeout(() => {
          this.end(key, subscription);
          if (this.idle()) this.detach();
        }, LINGER_MS);
    }
    if (this.idle()) this.detach();
  }

  private subscribe(key: ChildKey, child: Child): void {
    const range = this.range;
    const subscription: Subscription = {
      range,
      alive: true,
      failed: false,
      unsubscribe: Promise.resolve(undefined),
      linger: undefined,
    };
    this.subscriptions.set(key, subscription);
    this.markStale(key);
    subscription.unsubscribe = subscribeWeek(
      this.connection,
      child,
      range,
      (data) => {
        if (!subscription.alive) return;
        rememberSubjects(
          data.lessons.map((lesson) => lesson.title),
          data.tasks.map((task) => task.subject),
        );
        this.data.set(key, { range, data, error: undefined, stale: false });
        this.changed();
      },
      () => {
        this.ended(key, subscription);
      },
    ).catch((error: unknown) => {
      if (subscription.alive) {
        subscription.alive = false;
        subscription.failed = true;
        const current = this.data.get(key);
        this.data.set(key, {
          range,
          data: current?.data,
          error,
          stale: current?.data !== undefined,
        });
        this.changed();
      }
      return undefined;
    });
  }

  private end(key: ChildKey, subscription: Subscription): void {
    subscription.alive = false;
    clearTimeout(subscription.linger);
    subscription.linger = undefined;
    if (this.subscriptions.get(key) === subscription) this.subscriptions.delete(key);
    // An unsubscribe that fails, or of a subscription that was never made, changes nothing.
    void subscription.unsubscribe.then((unsubscribe) => unsubscribe?.()).catch(() => undefined);
    this.markStale(key);
  }

  // The integration ends a subscription when its entry is unloaded, as for a reload, or when Aula
  // no longer lists the child. The children are listed once the last of an entry's children has
  // ended and the entry has had a moment to come back.
  private ended(key: ChildKey, subscription: Subscription): void {
    if (!subscription.alive) return;
    this.end(key, subscription);
    this.refreshing = true;
    this.listed = false;
    this.changed();
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = undefined;
      this.listChildren();
    }, RELOAD_DELAY_MS);
  }

  private listChildren(): void {
    const listing = ++this.listing;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    fetchChildren(this.callWS).then(
      (children) => {
        if (listing === this.listing) this.onListed(children);
      },
      (error: unknown) => {
        if (listing === this.listing) this.onListFailed(error);
      },
    );
  }

  /** Tells whether retries go on: the window opens at the first failing listing in a row. */
  private retrying(): boolean {
    const now = Date.now();
    this.retryStart ??= now;
    return now - this.retryStart < RETRY_WINDOW_MS;
  }

  private retryLater(): void {
    const delay = RETRY_DELAYS_MS[Math.min(this.retries, RETRY_DELAYS_MS.length - 1)];
    this.retries++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      this.listChildren();
    }, delay);
  }

  private stopRetrying(): void {
    this.retryStart = undefined;
    this.retries = 0;
  }

  // While Home Assistant starts, the integration answers with an empty list until its entry has
  // loaded, and an entry being reloaded lacks its children until it is back: a listing that
  // lacks a child listed before, or that lists none, is retried, keeping what was shown.
  private onListed(children: Child[]): void {
    rememberChildren(children);
    const keys = new Set(children.map(childKey));
    const lacking = (this.list ?? []).filter((child) => !keys.has(childKey(child)));
    this.listed = true;
    this.listError = undefined;
    for (const [key, subscription] of this.subscriptions) {
      if (subscription.failed) this.subscriptions.delete(key);
    }
    this.missing.clear();
    if ((lacking.length > 0 || children.length === 0) && this.retrying()) {
      for (const child of lacking) this.missing.add(childKey(child));
      const kept = (this.list ?? []).filter(
        (child) => keys.has(childKey(child)) || this.missing.has(childKey(child)),
      );
      const known = new Set(kept.map(childKey));
      this.list = [...kept, ...children.filter((child) => !known.has(childKey(child)))];
      this.refreshing = true;
      this.retryLater();
    } else {
      this.list = children;
      this.refreshing = false;
      this.stopRetrying();
      for (const key of [...this.data.keys()]) if (!keys.has(key)) this.data.delete(key);
    }
    this.changed();
    this.reconcile();
  }

  private onListFailed(error: unknown): void {
    if (this.retrying()) {
      this.listError = this.list === undefined ? error : undefined;
      this.refreshing = this.list !== undefined;
      this.retryLater();
    } else {
      this.listError = error;
      this.refreshing = false;
      this.stopRetrying();
      if (this.list && this.missing.size > 0) {
        this.list = this.list.filter((child) => !this.missing.has(childKey(child)));
        this.missing.clear();
      }
    }
    this.changed();
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
