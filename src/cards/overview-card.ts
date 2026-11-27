/**
 * The overview, `custom:aula-connect-overview-card`: each child's day that matters now in a
 * glance, in the look the children's bar chooses, with the pages to go on to.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import { fetchPosts, fetchVacationRequests, fetchVacations } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import { addDays } from "../core/dates.ts";
import { selection } from "../core/selection.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant, Post, Vacation, VacationRequest } from "../core/types.ts";
import {
  familyForm,
  OVERVIEW_CARD,
  resolveOverviewConfig,
  type OverviewConfig,
} from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import {
  answeredAway,
  requestGroups,
  vacationGroups,
  vacationOn,
  type ChildReads,
} from "../model/absence.ts";
import type { Hold } from "../model/child.ts";
import { loginsOf, senderOf } from "../model/family.ts";
import { newsView, type NewsView } from "../model/news.ts";
import { AHEAD_DAYS, overviewView, type OverviewView } from "../model/overview.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { Loads } from "../ui/loads.ts";
import { renderOverview, type AbsenceView } from "../ui/overview.ts";
import { sickOptions } from "../ui/sick.ts";
import { base, blocks, details, family } from "../ui/styles.ts";

/** The overview. */
export class AulaConnectOverviewCard extends AulaCard<OverviewConfig, OverviewView> {
  /** The card's styles. */
  static override styles = base + blocks + details + family;
  readonly #requests = new Loads<VacationRequest[]>(() => {
    this.requestUpdate();
  });
  readonly #vacations = new Loads<Vacation[]>(() => {
    this.requestUpdate();
  });
  readonly #posts = new Loads<Post[]>(() => {
    this.requestUpdate();
  });

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return familyForm(OVERVIEW_CARD);
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(OVERVIEW_CARD, hass);
  }

  /** Returns the card's size in a sections view: the section's whole width. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 6, min_rows: 4 };
  }

  protected override wantsToday = true;

  protected override resolve(raw: unknown): OverviewConfig {
    return resolveOverviewConfig(raw);
  }

  protected override view(
    snapshot: StoreSnapshot,
    config: OverviewConfig,
    ctx: ViewContext,
    hold: Hold,
  ): OverviewView {
    return overviewView(snapshot, config, ctx, hold);
  }

  protected override content(
    view: OverviewView,
    config: OverviewConfig,
    ctx: ViewContext,
  ): TemplateResult {
    return renderOverview(view, ctx, this, {
      look: config.look ?? selection().look,
      paths: config.paths,
      packIcons: config.packIcons,
      sick: sickOptions(config),
      absence: this.#absence(view, config, ctx),
      news: config.paths.news === null ? 0 : this.#news(view, ctx).fresh,
      looks: { rows: config.rows, columns: config.columns, board: config.board },
    });
  }

  // A login's posts are read each quarter of an hour while the overview is shown.
  #news(view: OverviewView, ctx: ViewContext): NewsView {
    const quarter = `${ctx.today}|${String(Math.floor(ctx.minute / 15))}`;
    return newsView(
      loginsOf(view.children).map((entry) => ({
        entry,
        ...this.#posts.get(entry.entry_id, quarter, () => fetchPosts(this.callWS, entry.entry_id)),
      })),
      ctx.zone,
      view.children.map((item) => item.child),
    );
  }

  // The requests are read each day, and again when the number awaiting an answer changes; the
  // vacations each day, as a wall screen stays for days. The days an answer says a child does
  // not come are its vacation as much as one registered.
  #absence(view: OverviewView, config: OverviewConfig, ctx: ViewContext): AbsenceView {
    const requests: ChildReads<VacationRequest>[] = [];
    const vacations: ChildReads<Vacation>[] = [];
    const ongoing = new Map<number, Vacation>();
    let unread = false;
    for (const item of view.children) {
      const id = String(item.child.child_id);
      const pending = item.today?.vacation_requests_pending ?? 0;
      const asked = senderOf(item, config.sender, "vacation_requests");
      const answers = this.#requests.get(
        `${asked.entry_id}|${id}`,
        `${String(pending)}|${ctx.today}`,
        () => fetchVacationRequests(this.callWS, asked),
      );
      unread ||= pending > 0 && answers.data === undefined && answers.error !== undefined;
      requests.push({ child: item.child, entry: asked, data: answers.data });
      const entry = senderOf(item, config.sender, "vacations");
      const registered =
        this.#vacations.get(`${entry.entry_id}|${id}`, ctx.today, () =>
          fetchVacations(this.callWS, entry),
        ).data ?? [];
      const away = [...registered, ...answeredAway(answers.data ?? [], registered)];
      vacations.push({ child: item.child, entry, data: away });
      const now = vacationOn(away, ctx.today);
      if (now) ongoing.set(item.child.child_id, now);
    }
    const last = addDays(ctx.today, AHEAD_DAYS - 1);
    return {
      requests: requestGroups(requests, ctx.today).filter((group) => group.missing),
      unread,
      ongoing,
      coming: vacationGroups(vacations, ctx.today).filter(
        (group) => group.start > ctx.today && group.start <= last,
      ),
      answered: () => {
        this.#requests.refresh();
      },
    };
  }

  protected override emptySize(): number {
    return 10;
  }
}
