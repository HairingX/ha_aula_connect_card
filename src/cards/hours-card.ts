/**
 * The opening hours, `custom:aula-connect-hours-card`: the hours of the schools and institutions
 * the children the children's bar shows go to, this week and next, and the days they are closed.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import { fetchOpeningHours } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant, OpeningHours } from "../core/types.ts";
import type { CommonConfig } from "../config/common.ts";
import { familyForm, HOURS_CARD, resolveImportantConfig } from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import { familyView, type FamilyView } from "../model/family.ts";
import { hoursPeriod, hoursView } from "../model/hours.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { renderHours } from "../ui/hours.ts";
import { Loads } from "../ui/loads.ts";
import { base, blocks, details, family } from "../ui/styles.ts";

/** The opening hours card. */
export class AulaConnectHoursCard extends AulaCard<CommonConfig, FamilyView> {
  /** The card's styles. */
  static override styles = base + blocks + details + family;
  readonly #hours = new Loads<OpeningHours>(() => {
    this.requestUpdate();
  });

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return familyForm(HOURS_CARD);
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(HOURS_CARD, hass);
  }

  /** Returns the card's size in a sections view: the section's whole width. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 4, min_rows: 3 };
  }

  protected override resolve(raw: unknown): CommonConfig {
    return resolveImportantConfig(raw);
  }

  protected override view(snapshot: StoreSnapshot, config: CommonConfig): FamilyView {
    return familyView(snapshot, config.children);
  }

  // A child's hours are read once a day, through the first of its entries, as every guardian's
  // login tells the same institution's hours.
  protected override content(
    view: FamilyView,
    _config: CommonConfig,
    ctx: ViewContext,
  ): TemplateResult {
    const { start, end } = hoursPeriod(ctx.today);
    const loads = view.children.map(({ child }) => ({
      child,
      ...this.#hours.get(`${child.entry_id}|${String(child.child_id)}`, ctx.today, () =>
        fetchOpeningHours(this.callWS, child, start, end),
      ),
    }));
    return renderHours(hoursView(loads, ctx.today), ctx, this);
  }

  protected override emptySize(): number {
    return 3;
  }
}
