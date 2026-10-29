/**
 * The school day card, `custom:aula-connect-day-card`: the school day that matters now, for the
 * phone in the evening and the wall screen in the morning.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit";

import { fetchChildren } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import { rememberChildren, rememberLanguage } from "../core/memory.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant } from "../core/types.ts";
import { DAY_CARD, dayConfigForm, resolveDayConfig, type DayCardConfig } from "../config/day.ts";
import type { ConfigForm } from "../config/form.ts";
import type { Hold } from "../model/child.ts";
import { dayCardView, type DayCardView } from "../model/day-view.ts";
import { AulaCard } from "../ui/card.ts";
import { renderDay } from "../ui/day.ts";
import { base, blocks, dayStyles } from "../ui/styles.ts";

/** Remembers the language and the children for the editor, and returns a card's stub. */
export async function stub(type: string, hass?: HomeAssistant): Promise<{ type: string }> {
  if (hass) {
    rememberLanguage(hass.language);
    try {
      rememberChildren(await fetchChildren((message) => hass.callWS(message)));
    } catch {
      // The editor then takes child ids typed in.
    }
  }
  return { type: `custom:${type}` };
}

/** The school day card. */
export class AulaConnectDayCard extends AulaCard<DayCardConfig, DayCardView> {
  /** The card's styles. */
  static override styles = [base, blocks, dayStyles];

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return dayConfigForm();
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(DAY_CARD, hass);
  }

  /** Returns the card's size in a sections view: a section column wide, at least. */
  getGridOptions(): { columns: number; rows: string; min_columns: number; min_rows: number } {
    return { columns: 12, rows: "auto", min_columns: 12, min_rows: 4 };
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
