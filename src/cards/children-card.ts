/**
 * The children's bar, `custom:aula-connect-children-card`: the children's faces, which choose the
 * children every Aula card of the page shows, and the overview's look.
 *
 * @packageDocumentation
 */

import type { TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import { resetSelection, setPeople } from "../core/selection.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { HomeAssistant } from "../core/types.ts";
import {
  CHILDREN_CARD,
  familyForm,
  resolveChildrenConfig,
  type ChildrenBarConfig,
} from "../config/family.ts";
import type { ConfigForm } from "../config/form.ts";
import { AulaCard, stub } from "../ui/card.ts";
import { childrenBarView, renderChildrenBar, type ChildrenBarView } from "../ui/children-bar.ts";
import { base, family } from "../ui/styles.ts";

/** The children's bar. */
export class AulaConnectChildrenCard extends AulaCard<ChildrenBarConfig, ChildrenBarView> {
  /** The card's styles. */
  static override styles = base + family;

  /** Returns the form of the visual editor. */
  static getConfigForm(): ConfigForm {
    return familyForm(CHILDREN_CARD);
  }

  /** Returns a configuration that works as it is: the defaults follow later versions. */
  static getStubConfig(hass?: HomeAssistant): Promise<{ type: string }> {
    return stub(CHILDREN_CARD, hass);
  }

  /** Returns the card's size in a sections view: the section's whole width, a row high. */
  getGridOptions(): { columns: string; rows: string; min_columns: number; min_rows: number } {
    return { columns: "full", rows: "auto", min_columns: 6, min_rows: 1 };
  }

  protected override followsSelection = false;

  protected override resolve(raw: unknown): ChildrenBarConfig {
    const config = resolveChildrenConfig(raw);
    setPeople(new Map(config.people.map((item) => [item.child, item.person])));
    return config;
  }

  // On a wall the bar shows every child again, with the overview's first look, after a while.
  protected override idle(): void {
    super.idle();
    if (this.config?.size === "large") resetSelection();
  }

  protected override view(snapshot: StoreSnapshot, config: ChildrenBarConfig): ChildrenBarView {
    return childrenBarView(snapshot, config.children);
  }

  protected override content(
    view: ChildrenBarView,
    config: ChildrenBarConfig,
    ctx: ViewContext,
  ): TemplateResult {
    return renderChildrenBar(view, ctx, this, config.lookSwitch);
  }

  protected override emptySize(): number {
    return 2;
  }
}
