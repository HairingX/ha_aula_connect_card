/**
 * The children's bar: each child's face, which hides the child on every Aula card of the page or
 * shows it again, and the switch between the overview's looks.
 *
 * @packageDocumentation
 */

import { html, nothing, type TemplateResult } from "lit/html.js";

import { selectChildren } from "../core/children.ts";
import type { ViewContext } from "../core/context.ts";
import type { TextKey } from "../core/i18n.ts";
import { LOOKS, selection, setLook, toggleChild, type Look } from "../core/selection.ts";
import type { StoreSnapshot } from "../core/store.ts";
import type { Child } from "../core/types.ts";
import type { CardState } from "./card.ts";
import { faceImage, icon } from "./primitives.ts";

/** The look's name and icon. */
export const LOOK_NAMES: Readonly<Record<Look, readonly [TextKey, string]>> = {
  rows: ["lookRows", "mdi:view-agenda-outline"],
  columns: ["lookColumns", "mdi:view-column-outline"],
  board: ["lookBoard", "mdi:view-grid-outline"],
};

/** What the children's bar shows. */
export interface ChildrenBarView {
  /** The children, in their order. */
  readonly children: readonly Child[];
  /** The configured ids no child has. */
  readonly missing: readonly number[];
  /** The card's height in units of 50 pixels, roughly. */
  readonly size: number;
}

/** Builds the children's bar: every child of those configured, hidden or not. */
export function childrenBarView(snapshot: StoreSnapshot, ids: readonly number[]): ChildrenBarView {
  const { shown, missing } = selectChildren(snapshot.children.list ?? [], ids);
  return { children: shown, missing, size: 2 };
}

/** Renders the children's bar; `looks` adds the switch between the overview's looks. */
export function renderChildrenBar(
  view: ChildrenBarView,
  ctx: ViewContext,
  state: CardState,
  looks: boolean,
): TemplateResult {
  const { t } = ctx;
  const { hidden, look } = selection();
  const all = view.children.map((child) => child.child_id);
  return html`<section class="kids-bar" aria-label=${t("childrenBar")}>
    <div class="kid-faces">
      ${view.children.map((child) => {
        const shown = !hidden.includes(child.child_id);
        const face = state.face(child);
        return html`<button
          class="kid-face"
          type="button"
          aria-pressed=${shown ? "true" : "false"}
          @click=${() => {
            toggleChild(child.child_id, all);
          }}
        >
          <span class="kid-pic"
            >${faceImage(face)}${shown ? html`<span class="kid-tick">${icon("mdi:check")}</span>` : nothing}</span
          >
          <span class="kid-label">${face.name}</span>
        </button>`;
      })}
    </div>
    ${
      looks
        ? html`<div class="looks" role="group" aria-label=${t("look")}>
            ${LOOKS.map((item) => {
              const [name, mark] = LOOK_NAMES[item];
              return html`<button
                class="look"
                type="button"
                aria-pressed=${item === look ? "true" : "false"}
                @click=${() => {
                  setLook(item);
                }}
              >
                ${icon(mark)}<span class="look-name">${t(name)}</span>
              </button>`;
            })}
          </div>`
        : nothing
    }
  </section>`;
}
