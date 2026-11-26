/**
 * The Important page, `custom:aula-connect-important-card`: what the week plan marks as important for the children the
 * children's bar shows, by the day it is due, browsed a week at a time.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { DayRange, HomeAssistant } from "../core/types.ts";
import type { CommonConfig } from "../config/common.ts";
import { familyForm, IMPORTANT_CARD, resolveImportantConfig } from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import type { Hold } from "../model/child.ts";
import { importantPageView, type ImportantPageView } from "../model/important-page.ts";
import { extraWeeks } from "../model/week-view.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { renderWeekplanPage, type ImportantBrowser } from "../ui/important-page.ts";
import { base, blocks, family, weekStyles } from "../ui/styles.ts";

/** The Important page. */
export class AulaConnectImportantCard
  extends AulaCard<CommonConfig, ImportantPageView>
  implements ImportantBrowser
{
  /** The card's styles. */
  static override styles = base + blocks + weekStyles + family;
  #offset = 0;

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return familyForm(IMPORTANT_CARD);
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(IMPORTANT_CARD, hass);
  }

  /** Returns the card's size in a sections view: the section's whole width. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 6, min_rows: 4 };
  }

  /** Shows the week before (-1) or after (1), or with 0 this week. */
  browse(step: -1 | 0 | 1): void {
    const offset = step === 0 ? 0 : this.#offset + step;
    if (offset === this.#offset) return;
    this.#offset = offset;
    this.aula.configChanged();
    this.requestUpdate();
  }

  protected override extraDays = (): DayRange | undefined => {
    const range = this.aula.snapshot?.range;
    return range && extraWeeks(range, 1, this.#offset);
  };

  protected override idle(): void {
    super.idle();
    this.browse(0);
  }

  protected override resolve(raw: unknown): CommonConfig {
    return resolveImportantConfig(raw);
  }

  protected override view(
    snapshot: StoreSnapshot,
    config: CommonConfig,
    ctx: ViewContext,
    hold: Hold,
  ): ImportantPageView {
    return importantPageView(snapshot, config, ctx, hold, this.#offset);
  }

  protected override content(
    view: ImportantPageView,
    _config: CommonConfig,
    ctx: ViewContext,
  ): TemplateResult {
    return renderWeekplanPage(view, ctx, this);
  }

  protected override emptySize(): number {
    return 6;
  }
}
