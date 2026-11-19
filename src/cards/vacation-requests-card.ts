/**
 * The vacation requests card, `custom:aula-connect-vacation-requests-card`: the institution's
 * requests that can still be answered, for each child, each answered day by day on its own tap.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import { fetchVacationRequests } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant, VacationRequest } from "../core/types.ts";
import {
  familyForm,
  resolveActionConfig,
  VACATION_REQUESTS_CARD,
  type ActionConfig,
} from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import { familyView, senderOf, type FamilyView } from "../model/family.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { Loads, type Load } from "../ui/loads.ts";
import { base, blocks, details, family } from "../ui/styles.ts";
import { renderVacationRequests } from "../ui/vacation-requests.ts";

const WAITING: Load<VacationRequest[]> = { data: undefined, error: undefined, loading: true };

/** The vacation requests card. */
export class AulaConnectVacationRequestsCard extends AulaCard<ActionConfig, FamilyView> {
  /** The card's styles. */
  static override styles = base + blocks + details + family;
  readonly #requests = new Loads<VacationRequest[]>(() => {
    this.requestUpdate();
  });

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return familyForm(VACATION_REQUESTS_CARD);
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(VACATION_REQUESTS_CARD, hass);
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
    const children = view.children.map((item) => {
      const id = item.child.child_id;
      const entry = senderOf(item, config.sender);
      // The requests are asked for again each day and when the number awaiting an answer
      // changes; until the child's day has come, or failed to, that number is not known.
      const known = item.today !== undefined || item.error !== undefined;
      const load = known
        ? this.#requests.get(
            `${entry.entry_id}|${String(id)}`,
            `${String(item.today?.vacation_requests_pending)}|${ctx.today}`,
            () => fetchVacationRequests(this.callWS, entry),
          )
        : WAITING;
      return { family: item, entry, load };
    });
    return renderVacationRequests(children, ctx, this, () => {
      this.#requests.refresh();
    });
  }

  protected override emptySize(): number {
    return 3;
  }
}
