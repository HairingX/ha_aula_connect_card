/**
 * Ties a card element to the store of its connection and to the page's clock, while the element
 * is on the page with both `hass` and a configuration.
 *
 * @packageDocumentation
 */

import type { ReactiveController, ReactiveControllerHost } from "lit";

import { onMinute } from "../core/clock.ts";
import { settingsKey } from "../core/context.ts";
import { storeFor, type AulaStore, type StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant } from "../core/types.ts";

/** What a controller asks its card. */
export interface ControllerHooks {
  /** The child ids the card shows; undefined while it has no configuration. */
  readonly wanted: () => readonly number[] | undefined;
  /** Called on each tick of the clock, before the card renders again. */
  readonly tick: (now: Date) => void;
}

/** Watches the store and the clock for a card. */
export class AulaController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #hooks: ControllerHooks;
  #hass: HomeAssistant | undefined;
  #settings = "";
  #store: AulaStore | undefined;
  #release: (() => void) | undefined;
  #stopClock: (() => void) | undefined;
  #connected = false;

  /** Makes the controller of `host`. */
  constructor(host: ReactiveControllerHost, hooks: ControllerHooks) {
    this.#host = host;
    this.#hooks = hooks;
    host.addController(this);
  }

  /** What the store holds now; undefined until the card watches it. */
  get snapshot(): StoreSnapshot | undefined {
    return this.#store?.snapshot;
  }

  /**
   * Takes Home Assistant's state. Tells whether the card must render again: for a new connection,
   * or other language, time format or time zone. Home Assistant sets a new `hass` on every change
   * of an entity's state, which the cards ignore.
   */
  setHass(hass: HomeAssistant): boolean {
    const settings = settingsKey(hass);
    const changed = this.#hass?.connection !== hass.connection || settings !== this.#settings;
    this.#hass = hass;
    this.#settings = settings;
    if (changed) this.#sync();
    return changed;
  }

  /** Watches again with the children the configuration now names. */
  configChanged(): void {
    this.#sync();
  }

  /** Starts watching, when the card has what it needs. */
  hostConnected(): void {
    this.#connected = true;
    this.#sync();
  }

  /** Stops watching; the store keeps the data a minute, should the card come back. */
  hostDisconnected(): void {
    this.#connected = false;
    this.#unwatch();
  }

  #sync(): void {
    const children = this.#hooks.wanted();
    if (!this.#connected || !this.#hass || children === undefined) {
      this.#unwatch();
      return;
    }
    const store = storeFor(this.#hass);
    if (store !== this.#store) this.#unwatch();
    this.#store = store;
    const previous = this.#release;
    // Watching before letting go keeps a child both want from lingering or resubscribing.
    this.#release = store.watch({
      children,
      onChange: () => {
        this.#host.requestUpdate();
      },
    });
    previous?.();
    this.#stopClock ??= onMinute((now) => {
      this.#store?.touch(now);
      this.#hooks.tick(now);
      this.#host.requestUpdate();
    });
  }

  #unwatch(): void {
    this.#release?.();
    this.#release = undefined;
    this.#stopClock?.();
    this.#stopClock = undefined;
  }
}
