/**
 * The Aula Connect card: each child's week from the Aula Connect integration - timetable,
 * homework and notes from the week plan, events and birthdays. It only shows; it never changes
 * anything in Aula.
 *
 * @packageDocumentation
 */

import { html, LitElement, nothing, type TemplateResult } from "lit";

import { errorText, fetchChildren, subscribeWeek } from "./api";
import {
  defaultSections,
  resolveConfig,
  stubConfig,
  type CardConfig,
  type ResolvedConfig,
} from "./config";
import { addDays, dayOf, firstWeekday, startOfWeek, timeZone, useAmPm } from "./dates";
import { configForm, rememberChildren, rememberLanguage, type ConfigForm } from "./editor";
import { translator } from "./i18n";
import { alert, child, loading, type ChildState, type RenderContext } from "./render";
import { styles } from "./styles";
import type { Child, HassConnection, HassLocale, HomeAssistant, Unsubscribe } from "./types";

/** The card's version, set when it is built. */
export const CARD_VERSION = __CARD_VERSION__;

/** How long the card waits after the integration ends a subscription before it subscribes again. */
export const RELOAD_DELAY_MS = 3_000;

/** How often the card looks at the clock, for the current lesson and a new day or week. */
export const TICK_MS = 60_000;

/** The card element, `custom:aula-connect-card`. */
export class AulaConnectCard extends LitElement {
  /** The card's styles. */
  static override styles = styles;

  private _hass: HomeAssistant | undefined;
  private _config: ResolvedConfig | undefined;
  private _connection: HassConnection | undefined;
  private _detach: (() => void) | undefined;
  private _children: Child[] | undefined;
  private _childrenError: unknown;
  private readonly _states = new Map<number, ChildState>();
  private _unsubscribes: Promise<Unsubscribe | undefined>[] = [];
  /** Counts subscriptions given up, so that a late event or reply of one is ignored. */
  private _generation = 0;
  /** What the current subscriptions are for; undefined when there are none. */
  private _subscribed: string | undefined;
  private _today = "";
  private _timer: ReturnType<typeof setInterval> | undefined;
  private _reload: ReturnType<typeof setTimeout> | undefined;
  /** Whether the integration ended the subscriptions and the card is subscribing again. */
  private _updating = false;

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return configForm();
  }

  /** Returns a configuration that works as it is, and remembers the children for the editor. */
  static async getStubConfig(hass?: HomeAssistant): Promise<CardConfig> {
    if (hass) {
      rememberLanguage(hass.language);
      try {
        rememberChildren(await fetchChildren(hass));
      } catch {
        // The editor then takes child ids typed in.
      }
    }
    return stubConfig(hass?.language);
  }

  /**
   * Sets the configuration.
   *
   * @throws Error naming the first invalid setting.
   */
  setConfig(config: CardConfig): void {
    this._config = resolveConfig(config);
    this._sync();
    this.requestUpdate();
  }

  /** Sets Home Assistant's state; only a change of connection, language or time settings matters. */
  set hass(hass: HomeAssistant) {
    const before = this._hass;
    this._hass = hass;
    rememberLanguage(hass.language);
    if (before?.connection !== hass.connection || settings(before) !== settings(hass)) {
      this._sync();
      this.requestUpdate();
    }
  }

  /** Returns the card's height in units of 50 pixels, roughly. */
  getCardSize(): number {
    return 2 + 4 * (this._config?.weeks ?? 2);
  }

  /** Returns the card's size in a sections view. */
  getGridOptions(): { columns: number; rows: string; min_columns: number } {
    return { columns: 12, rows: "auto", min_columns: 6 };
  }

  /** Subscribes, and starts looking at the clock, once on a page. */
  override connectedCallback(): void {
    super.connectedCallback();
    this._timer = setInterval(() => {
      this._sync();
      this.requestUpdate();
    }, TICK_MS);
    this._sync();
  }

  /** Ends the subscriptions and stops looking at the clock. */
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this._timer);
    clearTimeout(this._reload);
    this._updating = false;
    this._unsubscribeAll();
    this._setConnection(undefined);
  }

  // A lost connection ends its subscriptions; they are made again when it is back, with the
  // children listed again, as the integration may have been reloaded meanwhile.
  private _setConnection(hass: HomeAssistant | undefined): void {
    this._detach?.();
    this._detach = undefined;
    this._connection = hass?.connection;
    if (!hass) return;
    const connection = hass.connection;
    const ready = (): void => {
      this._loadChildren(hass, connection);
    };
    const disconnected = (): void => {
      this._generation++;
      this._unsubscribes = [];
      this._subscribed = undefined;
    };
    connection.addEventListener("ready", ready);
    connection.addEventListener("disconnected", disconnected);
    this._detach = () => {
      connection.removeEventListener("ready", ready);
      connection.removeEventListener("disconnected", disconnected);
    };
    this._loadChildren(hass, connection);
  }

  private _loadChildren(hass: HomeAssistant, connection: HassConnection): void {
    fetchChildren(hass).then(
      (children) => {
        if (connection !== this._connection) return;
        this._children = children;
        this._childrenError = undefined;
        this._updating = false;
        rememberChildren(children);
        this._sync();
        this.requestUpdate();
      },
      (error: unknown) => {
        if (connection !== this._connection) return;
        this._childrenError = error;
        this._updating = false;
        this.requestUpdate();
      },
    );
  }

  // The integration ends subscriptions when its entry is reloaded; the children are listed again
  // once it has had a moment to come back, as an entry or a child may be gone.
  private _ended(hass: HomeAssistant, connection: HassConnection): void {
    this._unsubscribeAll();
    this._updating = true;
    this.requestUpdate();
    clearTimeout(this._reload);
    this._reload = setTimeout(() => {
      this._loadChildren(hass, connection);
    }, RELOAD_DELAY_MS);
  }

  private _unsubscribeAll(): void {
    this._generation++;
    for (const pending of this._unsubscribes) {
      void pending.then((unsubscribe) => unsubscribe?.()).catch(() => undefined);
    }
    this._unsubscribes = [];
    this._subscribed = undefined;
  }

  private _selected(config: ResolvedConfig, children: Child[]): Child[] {
    return config.children.length === 0
      ? children
      : children.filter((item) => config.children.includes(item.child_id));
  }

  private _range(hass: HomeAssistant, config: ResolvedConfig): { start: string; end: string } {
    const start = startOfWeek(this._today, firstWeekday(locale(hass)));
    return { start, end: addDays(start, 7 * config.weeks) };
  }

  /** Brings the subscriptions in line with the connection, configuration, children and week. */
  private _sync(): void {
    const { _hass: hass, _config: config } = this;
    if (!this.isConnected || !hass || !config) return;
    this._today = dayOf(new Date(), timeZone(hass));
    if (hass.connection !== this._connection) {
      this._unsubscribeAll();
      this._setConnection(hass);
    }
    if (!this._children) return;
    const { start, end } = this._range(hass, config);
    const selected = this._selected(config, this._children);
    const key = JSON.stringify([
      start,
      end,
      selected.map((item) => [item.entry_id, item.child_id]),
    ]);
    if (key === this._subscribed) return;
    this._unsubscribeAll();
    this._subscribed = key;
    const generation = this._generation;
    const connection = hass.connection;
    const range = `${start}/${end}`;
    for (const item of selected) {
      const previous = this._states.get(item.child_id);
      // Data of the same range stays on screen while it is renewed, as after a reconnect.
      this._states.set(
        item.child_id,
        previous?.range === range && previous.data ? { range, data: previous.data } : { range },
      );
      this._unsubscribes.push(
        subscribeWeek(
          connection,
          item,
          start,
          end,
          (data) => {
            if (generation !== this._generation) return;
            this._states.set(item.child_id, { range, data });
            this.requestUpdate();
          },
          () => {
            if (generation === this._generation) this._ended(hass, connection);
          },
        ).catch((error: unknown) => {
          if (generation === this._generation) {
            this._states.set(item.child_id, { range, error });
            this.requestUpdate();
          }
          return undefined;
        }),
      );
    }
  }

  /** Renders the card; nothing until it has a configuration and hass. */
  protected override render(): TemplateResult | typeof nothing {
    const { _hass: hass, _config: config } = this;
    if (!hass || !config) return nothing;
    const t = translator(hass.language);
    return html`<ha-card>
      <div class="card">
        ${this._updating ? html`<p class="quiet" role="status">${t("updating")}</p>` : nothing}
        ${
          this._childrenError === undefined
            ? nothing
            : alert("error", errorText(this._childrenError, t))
        }
        ${this._children ? this._content(hass, config, this._children) : this._childrenError === undefined ? loading(t) : nothing}
      </div>
    </ha-card>`;
  }

  private _content(hass: HomeAssistant, config: ResolvedConfig, children: Child[]): TemplateResult {
    const t = translator(hass.language);
    if (children.length === 0) return alert("info", t("noChildren"));
    const zone = timeZone(hass);
    const { start } = this._range(hass, config);
    const context: RenderContext = {
      t,
      language: locale(hass).language,
      zone,
      amPm: useAmPm(locale(hass)),
      today: this._today,
      now: new Date(),
      start,
      weeks: config.weeks,
      show: config.show,
      sections: config.sections ?? defaultSections(hass.language),
    };
    const missing = config.children.filter((id) => !children.some((item) => item.child_id === id));
    return html`${missing.map((id) => alert("warning", t("childNotFound", { id })))}
    ${this._selected(config, children).map((item) =>
      child(item, this._states.get(item.child_id), context),
    )}`;
  }
}

// Home Assistant leaves the locale's language empty until the user's profile has loaded.
function locale(hass: HomeAssistant): HassLocale {
  return { ...hass.locale, language: hass.locale.language || hass.language };
}

function settings(hass: HomeAssistant | undefined): string {
  return JSON.stringify([
    hass?.language,
    hass?.locale.language,
    hass?.locale.time_format,
    hass?.locale.first_weekday,
    hass?.locale.time_zone,
    hass?.config.time_zone,
  ]);
}

/** The entry Home Assistant's card picker lists the card by. */
export interface CustomCardEntry {
  /** The element's name, without `custom:`. */
  type: string;
  /** The name the picker shows. */
  name: string;
  /** What the picker says the card shows. */
  description: string;
  /** Whether the picker shows the card itself as its preview. */
  preview: boolean;
  /** The card's documentation. */
  documentationURL: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
  interface HTMLElementTagNameMap {
    "aula-connect-card": AulaConnectCard;
  }
}

// A dashboard can load the module twice, as from a cached and a new resource URL.
if (!customElements.get("aula-connect-card")) {
  customElements.define("aula-connect-card", AulaConnectCard);
  (window.customCards ??= []).push({
    type: "aula-connect-card",
    name: "Aula Connect",
    description:
      "Each child's week from Aula: timetable, homework and notes from the week plan, events and birthdays.",
    preview: true,
    documentationURL: "https://github.com/HairingX/ha_aula_connect_card",
  });
  console.info(
    `%c AULA-CONNECT-CARD %c ${CARD_VERSION} `,
    "color: #fff; background: #1f6fb2; font-weight: 700;",
    "color: #1f6fb2; background: #fff; font-weight: 700;",
  );
}
