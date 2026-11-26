/**
 * The Ferie/fri card, `custom:aula-connect-vacation-card`: the vacation requests awaiting an
 * answer, the vacations registered and not over yet, a vacation registered for the children chosen
 * or one deleted, and the requests answered; each change on its own tap and once confirmed.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import { fetchVacationRequests, fetchVacations } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant, Vacation, VacationRequest } from "../core/types.ts";
import {
  familyForm,
  resolveActionConfig,
  VACATION_CARD,
  type ActionConfig,
} from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import { requestGroups } from "../model/absence.ts";
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
  readonly #requests = new Loads<VacationRequest[]>(() => {
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

  /** Returns the card's size in a sections view: the section's whole width. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 4, min_rows: 2 };
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
      const id = String(item.child.child_id);
      // The requests are read each day, and again when the number awaiting an answer changes;
      // the vacations each day, as a wall screen stays for days.
      const asked = senderOf(item, config.sender, "vacation_requests");
      const requests = this.#requests.get(
        `${asked.entry_id}|${id}`,
        `${String(item.today?.vacation_requests_pending)}|${ctx.today}`,
        () => fetchVacationRequests(this.callWS, asked),
      );
      const entry = senderOf(item, config.sender, "vacations");
      const load = this.#vacations.get(`${entry.entry_id}|${id}`, ctx.today, () =>
        fetchVacations(this.callWS, entry),
      );
      return { family: item, entry, load, answers: requests.data ?? [], asked, requests };
    });
    return renderVacations(children, ctx, this, {
      requests: requestGroups(
        children.map(({ family, asked, requests }) => ({
          child: family.child,
          entry: asked,
          data: requests.data,
        })),
        ctx.today,
      ),
      requestErrors: children.flatMap(({ requests }) =>
        requests.error !== undefined && requests.data === undefined ? [requests.error] : [],
      ),
      changed: () => {
        this.#vacations.refresh();
      },
      answered: () => {
        this.#requests.refresh();
      },
    });
  }

  protected override emptySize(): number {
    return 3;
  }
}
