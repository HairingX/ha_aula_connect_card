/**
 * The homework card, `custom:aula-connect-homework-card`: the homework of the days ahead, by the
 * day it is for.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant } from "../core/types.ts";
import type { ConfigForm } from "../config/form.ts";
import {
  HOMEWORK_CARD,
  homeworkConfigForm,
  resolveHomeworkConfig,
  type HomeworkCardConfig,
} from "../config/homework.ts";
import type { Hold } from "../model/child.ts";
import { homeworkCardView, type HomeworkCardView } from "../model/homework-view.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { renderHomework } from "../ui/homework.ts";
import { base, blocks, homeworkStyles } from "../ui/styles.ts";

/** The homework card. */
export class AulaConnectHomeworkCard extends AulaCard<HomeworkCardConfig, HomeworkCardView> {
  /** The card's styles. */
  static override styles = base + blocks + homeworkStyles;

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return homeworkConfigForm();
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(HOMEWORK_CARD, hass);
  }

  /** Returns the card's size in a sections view: the section's whole width, for its columns. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 12, min_rows: 3 };
  }

  protected override resolve(raw: unknown): HomeworkCardConfig {
    return resolveHomeworkConfig(raw);
  }

  protected override view(
    snapshot: StoreSnapshot,
    config: HomeworkCardConfig,
    ctx: ViewContext,
    hold: Hold,
  ): HomeworkCardView {
    return homeworkCardView(snapshot, config, ctx, hold);
  }

  protected override content(
    view: HomeworkCardView,
    _config: HomeworkCardConfig,
    ctx: ViewContext,
  ): TemplateResult {
    return renderHomework(view, ctx, this);
  }

  protected override emptySize(): number {
    return 6;
  }
}
