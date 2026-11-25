/**
 * The sick card, `custom:aula-connect-sick-card`: a row for each child, which reports it sick
 * and writes a message about it, each on its own tap.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant } from "../core/types.ts";
import { familyForm, resolveActionConfig, SICK_CARD, type ActionConfig } from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import { familyView, type FamilyView } from "../model/family.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { renderSickCard } from "../ui/sick.ts";
import { base, blocks, details, family } from "../ui/styles.ts";

/** The sick card. */
export class AulaConnectSickCard extends AulaCard<ActionConfig, FamilyView> {
  /** The card's styles. */
  static override styles = base + blocks + details + family;

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return familyForm(SICK_CARD);
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(SICK_CARD, hass);
  }

  /** Returns the card's size in a sections view: half the section's width, or more. */
  getGridOptions(): { columns: number; rows: string; min_columns: number; min_rows: number } {
    return { columns: 6, rows: "auto", min_columns: 4, min_rows: 2 };
  }

  protected override wantsToday = true;

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
    return renderSickCard(view, ctx, this, { message: config.sickMessage, sender: config.sender });
  }

  protected override emptySize(): number {
    return 3;
  }
}
