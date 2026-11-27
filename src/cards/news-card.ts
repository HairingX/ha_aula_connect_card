/**
 * The news feed, `custom:aula-connect-news-card`: the newest posts of Aula's news feed for the
 * logins the children the children's bar shows are read through, the new and the important
 * marked, each read whole on a tap.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import { fetchPosts } from "../core/api.ts";
import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant, Post } from "../core/types.ts";
import type { CommonConfig } from "../config/common.ts";
import { familyForm, NEWS_CARD, resolveImportantConfig } from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import { familyView, loginsOf, type FamilyView } from "../model/family.ts";
import { newsView } from "../model/news.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { Loads } from "../ui/loads.ts";
import { renderNews } from "../ui/news.ts";
import { base, blocks, details, family } from "../ui/styles.ts";

/** The most posts the feed shows. */
export const MAX_POSTS = 20;

/** The news feed. */
export class AulaConnectNewsCard extends AulaCard<CommonConfig, FamilyView> {
  /** The card's styles. */
  static override styles = base + blocks + details + family;
  readonly #posts = new Loads<Post[]>(() => {
    this.requestUpdate();
  });

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return familyForm(NEWS_CARD);
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(NEWS_CARD, hass);
  }

  /** Returns the card's size in a sections view: the section's whole width. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 6, min_rows: 4 };
  }

  protected override resolve(raw: unknown): CommonConfig {
    return resolveImportantConfig(raw);
  }

  protected override view(snapshot: StoreSnapshot, config: CommonConfig): FamilyView {
    return familyView(snapshot, config.children);
  }

  // A login's posts are read each quarter of an hour while the feed is shown.
  protected override content(
    view: FamilyView,
    _config: CommonConfig,
    ctx: ViewContext,
  ): TemplateResult {
    const quarter = `${ctx.today}|${String(Math.floor(ctx.minute / 15))}`;
    const loads = loginsOf(view.children).map((entry) => ({
      entry,
      ...this.#posts.get(entry.entry_id, quarter, () => fetchPosts(this.callWS, entry.entry_id)),
    }));
    return renderNews(
      newsView(
        loads,
        ctx.zone,
        view.children.map((item) => item.child),
      ),
      ctx,
      this,
      MAX_POSTS,
      () => {
        this.#posts.refresh();
      },
    );
  }

  protected override emptySize(): number {
    return 4;
  }
}
