/**
 * What the three cards share as elements: their configuration and `hass`, the store and the
 * clock, the states before there is anything to show, and what a shared screen needs: the focus
 * day never changes under a finger, and what someone opened closes again by itself.
 *
 * @packageDocumentation
 */

import { html, LitElement, nothing, type TemplateResult } from "lit";

import { viewContext, type ViewContext } from "../core/context.ts";
import { rememberLanguage } from "../core/memory.ts";
import type { StoreSnapshot } from "../core/store.ts";
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
  /** Tells whether a disclosure is open: as the user left it, else `fallback`. */
  isOpen(key: string, fallback: boolean): boolean;
  /** Returns the `toggle` handler of a disclosure, which keeps the state the user chose. */
  toggled(key: string, fallback: boolean): (event: Event) => void;
  /** Tells whether a plan block is open, and whether a note in it is cut short. */
  plan(key: string): { open: boolean; cut: boolean };
  /** Opens or closes a plan block. */
  togglePlan(key: string): void;
}

const INTERACTIONS = ["pointerdown", "keydown", "wheel"] as const;

/** The base of the three card elements. */
export abstract class AulaCard<Config extends CardConfigBase, View extends CardViewBase>
  extends LitElement
  implements CardState
{
  /** The resolved configuration. */
  protected config: Config | undefined;
  private hassValue: HomeAssistant | undefined;
  /** The store and the clock. */
  protected readonly aula: AulaController;
  private lastInteraction = Number.NEGATIVE_INFINITY;
  private readonly shown = new Map<ChildKey, Focus>();
  private readonly opened = new Map<string, boolean>();
  private readonly cut = new Map<string, boolean>();
  private lastSize: number | undefined;

  constructor() {
    super();
    this.aula = new AulaController(this, {
      wanted: () => this.config?.children,
      tick: (now) => {
        this.tick(now);
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
    this.hassValue = hass;
    rememberLanguage(hass.language);
    if (this.aula.setHass(hass)) this.requestUpdate();
  }

  /** Returns the card's height in units of 50 pixels, roughly, for the masonry view. */
  getCardSize(): number {
    const size = this.lastSize ?? this.emptySize(this.config);
    return Math.round(size * (this.config?.size === "large" ? 1.5 : 1));
  }

  /** Starts tracking touches, so that the card holds still under a finger. */
  override connectedCallback(): void {
    super.connectedCallback();
    for (const type of INTERACTIONS) this.addEventListener(type, this.touched, { passive: true });
    this.renderRoot.addEventListener("scroll", this.touched, { capture: true, passive: true });
  }

  /** Stops tracking touches. */
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const type of INTERACTIONS) this.removeEventListener(type, this.touched);
    this.renderRoot.removeEventListener("scroll", this.touched, { capture: true });
  }

  private readonly touched = (): void => {
    this.lastInteraction = Date.now();
  };

  // While the card was touched in the last minute, the focus day it shows stays; when it moves
  // on, what the user opened for that child closes.
  private readonly hold: Hold = (key, chosen) => {
    const shown = this.shown.get(key);
    const focus = heldFocus(shown, chosen, this.lastInteraction, Date.now());
    if (shown !== undefined && shown.day !== focus.day) {
      for (const opened of [...this.opened.keys()]) {
        if (opened.startsWith(`${key}|`)) this.opened.delete(opened);
      }
    }
    this.shown.set(key, focus);
    return focus;
  };

  // On a shared screen, what someone opened closes again after ten minutes without a touch.
  private tick(now: Date): void {
    if (now.getTime() - this.lastInteraction >= IDLE_RESET_MS) this.opened.clear();
  }

  /** Tells whether a disclosure is open: as the user left it, else `fallback`. */
  isOpen(key: string, fallback: boolean): boolean {
    return this.opened.get(key) ?? fallback;
  }

  /** Returns the `toggle` handler of a disclosure, which keeps the state the user chose. */
  toggled(key: string, fallback: boolean): (event: Event) => void {
    return (event) => {
      const open = (event.currentTarget as HTMLDetailsElement).open;
      if (open === this.isOpen(key, fallback)) return;
      this.opened.set(key, open);
      this.requestUpdate();
    };
  }

  /** Tells whether a plan block is open, and whether a note in it is cut short. */
  plan(key: string): { open: boolean; cut: boolean } {
    return { open: this.opened.get(key) ?? false, cut: this.cut.get(key) ?? false };
  }

  /** Opens or closes a plan block. */
  togglePlan(key: string): void {
    this.opened.set(key, !(this.opened.get(key) ?? false));
    this.requestUpdate();
  }

  /** Measures which plan blocks cut a note short, so that "Vis mere" shows only then. */
  protected override updated(): void {
    let changed = false;
    for (const block of this.renderRoot.querySelectorAll<HTMLElement>("[data-plan]")) {
      if (block.classList.contains("open")) continue;
      const key = block.dataset.plan ?? "";
      const cut = [...block.querySelectorAll<HTMLElement>(".plan-text")].some(
        (text) => text.scrollHeight > text.clientHeight + 1,
      );
      if (cut !== (this.cut.get(key) ?? false)) {
        this.cut.set(key, cut);
        changed = true;
      }
    }
    if (changed) this.requestUpdate();
  }

  /** Renders the card; nothing until it has a configuration and `hass`. */
  protected override render(): TemplateResult | typeof nothing {
    const { config, hassValue: hass } = this;
    if (!config || !hass) return nothing;
    const ctx = viewContext(hass, new Date());
    return html`<ha-card>
      <div class="aula ${config.size}" lang=${ctx.lang}>
        <div class="body">${this.body(this.aula.snapshot, config, ctx)}</div>
      </div>
    </ha-card>`;
  }

  private body(snapshot: StoreSnapshot | undefined, config: Config, ctx: ViewContext): unknown {
    const { t } = ctx;
    const children = snapshot?.children;
    if (!snapshot || !children?.list) {
      return children?.error === undefined ? loading(t) : apiError(children.error, t);
    }
    const top = html`${children.refreshing ? refreshing(t) : nothing}${
      children.error === undefined ? nothing : apiError(children.error, t)
    }`;
    if (children.list.length === 0) return html`${top}${alert("info", t("noChildren"))}`;
    const view = this.view(snapshot, config, ctx, this.hold);
    this.lastSize = view.size;
    return html`${top}${view.missing.map((id) => alert("warning", t("childNotFound", { id })))}${this.content(
      view,
      config,
      ctx,
    )}`;
  }
}
