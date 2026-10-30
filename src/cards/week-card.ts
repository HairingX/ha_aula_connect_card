/**
 * The week card, `custom:aula-connect-card`, the element 0.0.2 had: each child's weeks day by
 * day, for planning.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant } from "../core/types.ts";
import type { ConfigForm } from "../config/form.ts";
import {
  resolveWeekConfig,
  WEEK_CARD,
  weekConfigForm,
  type WeekCardConfig,
} from "../config/week.ts";
import type { Hold } from "../model/child.ts";
import { weekCardView, type WeekCardView } from "../model/week-view.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { base, blocks, weekStyles } from "../ui/styles.ts";
import { renderWeek } from "../ui/week.ts";

/** The week card. */
export class AulaConnectCard extends AulaCard<WeekCardConfig, WeekCardView> {
  /** The card's styles. */
  static override styles = base + blocks + weekStyles;

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return weekConfigForm();
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(WEEK_CARD, hass);
  }

  /** Returns the card's size in a sections view: the section's whole width. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 12, min_rows: 6 };
  }

  protected override resolve(raw: unknown): WeekCardConfig {
    return resolveWeekConfig(raw);
  }

  protected override view(
    snapshot: StoreSnapshot,
    config: WeekCardConfig,
    ctx: ViewContext,
    hold: Hold,
  ): WeekCardView {
    return weekCardView(snapshot, config, ctx, hold);
  }

  protected override content(
    view: WeekCardView,
    _config: WeekCardConfig,
    ctx: ViewContext,
  ): TemplateResult {
    return renderWeek(view, ctx, this);
  }

  protected override emptySize(config: WeekCardConfig | undefined): number {
    return 3 + 7 * (config?.weeks ?? 2);
  }
}
