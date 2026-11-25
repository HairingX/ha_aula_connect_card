/**
 * The vacation card, `custom:aula-connect-vacation-card`: the vacations registered for each child
 * and not over yet, a vacation registered for the children chosen, and one deleted, each on its
 * own tap and once confirmed.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import { fetchVacations } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant, Vacation } from "../core/types.ts";
import {
  familyForm,
  resolveActionConfig,
  VACATION_CARD,
  type ActionConfig,
} from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import { familyView, senderOf, type FamilyView } from "../model/family.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { Loads } from "../ui/loads.ts";
import { base, blocks, details, family } from "../ui/styles.ts";
import { renderVacations } from "../ui/vacation.ts";

/** The vacation card. */
export class AulaConnectVacationCard extends AulaCard<ActionConfig, FamilyView> {
  /** The card's styles. */
  static override styles = base + blocks + details + family;
  readonly #vacations = new Loads<Vacation[]>(() => {
    this.requestUpdate();
  });

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return familyForm(VACATION_CARD);
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(VACATION_CARD, hass);
  }

  /** Returns the card's size in a sections view: half the section's width, or more. */
  getGridOptions(): { columns: number; rows: string; min_columns: number; min_rows: number } {
    return { columns: 6, rows: "auto", min_columns: 4, min_rows: 2 };
  }

  protected override resolve(raw: unknown): ActionConfig {
    return resolveActionConfig(raw);
  }

  protected override view(snapshot: StoreSnapshot, config: ActionConfig): FamilyView {
    return familyView(snapshot, config.children);
  }

  protected override content(
    view: FamilyView,
    config: ActionConfig,
    ctx: ViewContext,
  ): TemplateResult {
    const children = view.children.map((item) => {
      const id = item.child.child_id;
      const entry = senderOf(item, config.sender, "vacations");
      // Asked for again each day, as a wall screen stays for days.
      const load = this.#vacations.get(`${entry.entry_id}|${String(id)}`, ctx.today, () =>
        fetchVacations(this.callWS, entry),
      );
      return { family: item, entry, load };
    });
    return renderVacations(children, ctx, this, () => {
      this.#vacations.refresh();
    });
  }

  protected override emptySize(): number {
    return 3;
  }
}
