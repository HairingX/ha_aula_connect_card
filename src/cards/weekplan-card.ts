/**
 * The week plan card, `custom:aula-connect-weekplan-card`: the week plan of the days ahead, by the
 * day it is for.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant } from "../core/types.ts";
import type { ConfigForm } from "../config/form.ts";
import {
  WEEKPLAN_CARD,
  weekplanConfigForm,
  resolveWeekplanConfig,
  type WeekplanCardConfig,
} from "../config/weekplan.ts";
import type { Hold } from "../model/child.ts";
import { weekplanCardView, type WeekplanCardView } from "../model/weekplan-view.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { renderWeekplan } from "../ui/weekplan.ts";
import { base, blocks, weekplanStyles } from "../ui/styles.ts";

/** The week plan card. */
export class AulaConnectWeekplanCard extends AulaCard<WeekplanCardConfig, WeekplanCardView> {
  /** The card's styles. */
  static override styles = base + blocks + weekplanStyles;

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return weekplanConfigForm();
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(WEEKPLAN_CARD, hass);
  }

  /** Returns the card's size in a sections view: the section's whole width, for its columns. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 12, min_rows: 3 };
  }

  protected override resolve(raw: unknown): WeekplanCardConfig {
    return resolveWeekplanConfig(raw);
  }

  protected override view(
    snapshot: StoreSnapshot,
    config: WeekplanCardConfig,
    ctx: ViewContext,
    hold: Hold,
  ): WeekplanCardView {
    return weekplanCardView(snapshot, config, ctx, hold);
  }

  protected override content(
    view: WeekplanCardView,
    _config: WeekplanCardConfig,
    ctx: ViewContext,
  ): TemplateResult {
    return renderWeekplan(view, ctx, this);
  }

  protected override emptySize(): number {
    return 6;
  }
}
