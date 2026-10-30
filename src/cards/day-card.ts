/**
 * The school day card, `custom:aula-connect-day-card`: the school day that matters now, for the
 * phone in the evening and the wall screen in the morning.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant } from "../core/types.ts";
import { DAY_CARD, dayConfigForm, resolveDayConfig, type DayCardConfig } from "../config/day.ts";
import type { ConfigForm } from "../config/form.ts";
import type { Hold } from "../model/child.ts";
import { dayCardView, type DayCardView } from "../model/day-view.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { renderDay } from "../ui/day.ts";
import { base, blocks, dayStyles } from "../ui/styles.ts";

/** The school day card. */
export class AulaConnectDayCard extends AulaCard<DayCardConfig, DayCardView> {
  /** The card's styles. */
  static override styles = base + blocks + dayStyles;

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return dayConfigForm();
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(DAY_CARD, hass);
  }

  /** Returns the card's size in a sections view: the section's whole width, for its columns. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 12, min_rows: 4 };
  }

  protected override resolve(raw: unknown): DayCardConfig {
    return resolveDayConfig(raw);
  }

  protected override view(
    snapshot: StoreSnapshot,
    config: DayCardConfig,
    ctx: ViewContext,
    hold: Hold,
  ): DayCardView {
    return dayCardView(snapshot, config, ctx, hold);
  }

  protected override content(
    view: DayCardView,
    _config: DayCardConfig,
    ctx: ViewContext,
  ): TemplateResult {
    return renderDay(view, ctx, this);
  }

  protected override emptySize(): number {
    return 9;
  }
}
