/**
 * What the three cards share as elements: their configuration and `hass`, the store and the
 * clock, the states before there is anything to show, and what a shared screen needs: the focus
 * day never changes under a finger, and what someone opened closes again by itself.
 *
 * @packageDocumentation
 */

import { html, nothing, render as renderTemplate, type TemplateResult } from "lit/html.js";

import { viewContext, type Labels, type ViewContext } from "../core/context.ts";
import { rememberLanguage } from "../core/memory.ts";
import { storeFor, type StoreSnapshot } from "../core/store.ts";
import type { ChildKey, HomeAssistant } from "../core/types.ts";
import type { Hold } from "../model/child.ts";
import { heldFocus, IDLE_RESET_MS, type Focus } from "../model/focus.ts";
import { AulaController } from "./controller.ts";
import { alert, apiError, loading, refreshing } from "./primitives.ts";

/** What the base element reads from every card's configuration. */
export interface CardConfigBase {
  /** The child ids shown; every child when empty. */
  readonly children: readonly number[];
  /** `large` for a wall screen. */
  readonly size: "normal" | "large";
  /** Whether the timetable opens folded to its subjects and their start times, or in full. */
  readonly timetable: "compact" | "full";
  /** The lines of a note of the plan shown before "Vis mere"; 0 shows every note whole. */
  readonly infoLines: number;
  /** The names chosen for the week plan's two kinds of notes. */
  readonly labels: Labels;
}

/** How a day's timetable and plan are folded. */
export interface Folding {
  /** Whether the timetable opens in full rather than folded to subjects and start times. */
  readonly full: boolean;
  /** The lines of a note of the plan shown before "Vis mere"; 0 shows every note whole. */
  readonly lines: number;
}

/** What the base element reads from every card's view. */
export interface CardViewBase {
  /** The configured child ids no child has. */
  readonly missing: readonly number[];
  /** The card's height in units of 50 pixels, roughly. */
  readonly size: number;
}

/** What a card's template asks the element: what is open, and what is cut short. */
export interface CardState {
  /** How the configuration folds a day's timetable and plan. */
  readonly folding: Folding;
  /** Tells whether a disclosure is open: as the user left it, else `fallback`. */
  isOpen(key: string, fallback: boolean): boolean;
  /** Returns the `toggle` handler of a disclosure, which keeps the state the user chose. */
  toggled(key: string, fallback: boolean): (event: Event) => void;
  /** Opens or closes what a button discloses, from `fallback` until the user chose. */
  toggle(key: string, fallback: boolean): void;
  /** Tells whether a text marked `data-cut` with the key is cut short where it is folded. */
  cut(key: string): boolean;
}

// A screen reader, voice control or find-in-page opens a disclosure with a bare click or none.
const INTERACTIONS = ["pointerdown", "keydown", "wheel", "click", "focusin"] as const;

/** How long a stub waits for the children to be listed for the editor. */
export const STUB_WAIT_MS = 3_000;

/**
 * Remembers the language and lists the children for the editor through the page's store, and
 * returns a card's stub: only its type, so that the defaults follow later versions.
 */
export async function stub(type: string, hass?: HomeAssistant): Promise<{ type: string }> {
  if (hass) {
    rememberLanguage(hass.language);
    await storeFor(hass).whenListed(STUB_WAIT_MS);
  }
  return { type: `custom:${type}` };
}

/**
 * The base of the three card elements: a shadow root with the card's styles, into which it
 * renders lit's templates when asked, once a task.
 */
export abstract class AulaCard<Config extends CardConfigBase, View extends CardViewBase>
  extends HTMLElement
  implements CardState
{
  /** The card's styles, as CSS. */
  static styles = "";
  /** Where the card renders. */
  readonly renderRoot: ShadowRoot;
  /** The resolved configuration. */
  protected config: Config | undefined;
  #hassValue: HomeAssistant | undefined;
  /** The store and the clock. */
  protected readonly aula: AulaController;
  #lastInteraction = Number.NEGATIVE_INFINITY;
  readonly #shown = new Map<ChildKey, Focus>();
  readonly #opened = new Map<string, boolean>();
  readonly #cut = new Map<string, boolean>();
  #lastSize: number | undefined;
  #resized: ResizeObserver | undefined;
  #connected = false;
  #pending: Promise<void> | undefined;

  constructor() {
    super();
    this.renderRoot = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = (this.constructor as typeof AulaCard).styles;
    this.renderRoot.append(style);
    this.aula = new AulaController(this, {
      wanted: () => this.config?.children,
      tick: (now) => {
        this.#tick(now);
      },
    });
  }

  /**
   * Checks a configuration and fills in its defaults.
   *
   * @throws Error naming the first invalid key.
   */
  protected abstract resolve(raw: unknown): Config;

  /** Builds the card's view. */
  protected abstract view(
    snapshot: StoreSnapshot,
    config: Config,
    ctx: ViewContext,
    hold: Hold,
  ): View;

  /** Renders the card's view. */
  protected abstract content(view: View, config: Config, ctx: ViewContext): TemplateResult;

  /** The card's height in units of 50 pixels before its data has come. */
  protected abstract emptySize(config: Config | undefined): number;

  /**
   * Sets the configuration.
   *
   * @throws Error naming the first invalid key, which Home Assistant shows as an error card.
   */
  setConfig(raw: unknown): void {
    this.config = this.resolve(raw);
    this.aula.configChanged();
    this.requestUpdate();
  }

  /** Sets Home Assistant's state; only a new connection, language or time setting matters. */
  set hass(hass: HomeAssistant) {
    this.#hassValue = hass;
    rememberLanguage(hass.language);
    if (this.aula.setHass(hass)) this.requestUpdate();
  }

  /** Returns the card's height in units of 50 pixels, roughly, for the masonry view. */
  getCardSize(): number {
    const size = this.#lastSize ?? this.emptySize(this.config);
    return Math.round(size * (this.config?.size === "large" ? 1.5 : 1));
  }

  /** Watches the store and the clock, and tracks touches, so that the card holds still under a finger. */
  connectedCallback(): void {
    this.#connected = true;
    this.aula.hostConnected();
    for (const type of INTERACTIONS) this.addEventListener(type, this.#touched, { passive: true });
    this.renderRoot.addEventListener("scroll", this.#touched, { capture: true, passive: true });
    this.requestUpdate();
  }

  /** Stops watching, and tracking touches and sizes. */
  disconnectedCallback(): void {
    this.#connected = false;
    this.aula.hostDisconnected();
    for (const type of INTERACTIONS) this.removeEventListener(type, this.#touched);
    this.renderRoot.removeEventListener("scroll", this.#touched, { capture: true });
    this.#resized?.disconnect();
    this.#resized = undefined;
  }

  readonly #touched = (): void => {
    this.#lastInteraction = Date.now();
  };

  // While the card was touched in the last minute, the focus day it shows stays; when it moves
  // on, what the user opened for that child closes.
  readonly #hold: Hold = (key, chosen) => {
    const shown = this.#shown.get(key);
    const focus = heldFocus(shown, chosen, this.#lastInteraction, Date.now());
    if (shown !== undefined && shown.day !== focus.day) {
      for (const opened of [...this.#opened.keys()]) {
        if (opened.startsWith(`${key}|`)) this.#opened.delete(opened);
      }
    }
    this.#shown.set(key, focus);
    return focus;
  };

  // On a shared screen, what someone opened closes again after ten minutes without a touch.
  #tick(now: Date): void {
    if (now.getTime() - this.#lastInteraction >= IDLE_RESET_MS) this.#opened.clear();
  }

  /** How the configuration folds a day's timetable and plan. */
  get folding(): Folding {
    return { full: this.config?.timetable === "full", lines: Number(this.config?.infoLines) };
  }

  /** Tells whether a disclosure is open: as the user left it, else `fallback`. */
  isOpen(key: string, fallback: boolean): boolean {
    return this.#opened.get(key) ?? fallback;
  }

  /** Returns the `toggle` handler of a disclosure, which keeps the state the user chose. */
  toggled(key: string, fallback: boolean): (event: Event) => void {
    return (event) => {
      const open = (event.currentTarget as HTMLDetailsElement).open;
      if (open === this.isOpen(key, fallback)) return;
      this.#lastInteraction = Date.now();
      this.#opened.set(key, open);
      this.requestUpdate();
    };
  }

  /** Opens or closes what a button discloses, from `fallback` until the user chose. */
  toggle(key: string, fallback: boolean): void {
    this.#lastInteraction = Date.now();
    this.#opened.set(key, !this.isOpen(key, fallback));
    this.requestUpdate();
  }

  /** Tells whether a text marked `data-cut` with the key is cut short where it is folded. */
  cut(key: string): boolean {
    return this.#cut.get(key) ?? false;
  }

  /** Renders the card again at the end of the task, once however often it is asked. */
  requestUpdate(): void {
    this.#pending ??= Promise.resolve().then(() => {
      this.#pending = undefined;
      if (!this.#connected) return;
      renderTemplate(this.render(), this.renderRoot);
      this.#measure();
    });
  }

  /** Resolves once the card has rendered all it was asked to. */
  get updateComplete(): Promise<boolean> {
    return this.#pending ? this.#pending.then(() => this.updateComplete) : Promise.resolve(true);
  }

  /**
   * Measures which folded texts are cut short, so that "Vis mere" shows only then: after each
   * render, and when a text's width changes, as when the card is turned or shown. An unfolded
   * text keeps what was measured while it was folded.
   */
  #measure(): void {
    let changed = false;
    if (typeof ResizeObserver === "function") {
      this.#resized ??= new ResizeObserver(() => {
        this.requestUpdate();
      });
    }
    for (const text of this.renderRoot.querySelectorAll<HTMLElement>(".clamp[data-cut]")) {
      this.#resized?.observe(text);
      const key = String(text.dataset.cut);
      const cut = text.scrollHeight > text.clientHeight + 1;
      if (cut !== this.cut(key)) {
        this.#cut.set(key, cut);
        changed = true;
      }
    }
    if (changed) this.requestUpdate();
  }

  /** Returns what the card shows; nothing until it has a configuration and `hass`. */
  protected render(): TemplateResult | typeof nothing {
    const { config } = this;
    const hass = this.#hassValue;
    if (!config || !hass) return nothing;
    const ctx = viewContext(hass, new Date(), config.labels);
    return html`<ha-card>
      <div class="aula ${config.size}" lang=${ctx.lang}>
        <div class="body">${this.#body(this.aula.snapshot, config, ctx)}</div>
      </div>
    </ha-card>`;
  }

  #body(snapshot: StoreSnapshot | undefined, config: Config, ctx: ViewContext): unknown {
    const { t } = ctx;
    const children = snapshot?.children;
    if (!snapshot || !children?.list) {
      return children?.error === undefined ? loading(t) : apiError(children.error, t);
    }
    const top = html`${children.refreshing ? refreshing(t) : nothing}${
      children.error === undefined ? nothing : apiError(children.error, t)
    }`;
    // An empty list is retried for a while, as Home Assistant answers one while it starts.
    if (children.list.length === 0) {
      return children.refreshing ? loading(t) : html`${top}${alert("info", t("noChildren"))}`;
    }
    // On a wall nobody may be near to reload: data the card cannot show is said, not a blank.
    try {
      const view = this.view(snapshot, config, ctx, this.#hold);
      this.#lastSize = view.size;
      // A child not listed yet is waited for while the listing is retried, as at a start.
      const missing = children.refreshing ? [] : view.missing;
      // A card none of whose children is listed shows no empty card under the warning.
      const shown = config.children.length === 0 || view.missing.length < config.children.length;
      return html`${top}${missing.map((id) => alert("warning", t("childNotFound", { id })))}${
        shown ? this.content(view, config, ctx) : nothing
      }`;
    } catch (error) {
      return alert("error", t("errorGeneric", { message: String(error) }));
    }
  }
}
