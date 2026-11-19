/**
 * The overview, `custom:aula-connect-overview-card`: each child's day that matters now in a
 * glance, in the look the children's bar chooses, with the pages to go on to.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import { selection } from "../core/selection.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant } from "../core/types.ts";
import {
  familyForm,
  OVERVIEW_CARD,
  resolveOverviewConfig,
  type OverviewConfig,
} from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import type { Hold } from "../model/child.ts";
import { overviewView, type OverviewView } from "../model/overview.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { renderOverview } from "../ui/overview.ts";
import { base, blocks, details, family } from "../ui/styles.ts";

/** The overview. */
export class AulaConnectOverviewCard extends AulaCard<OverviewConfig, OverviewView> {
  /** The card's styles. */
  static override styles = base + blocks + details + family;

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
      message: config.sickMessage,
      sender: config.sender,
    });
  }

  protected override emptySize(): number {
    return 10;
  }
}
