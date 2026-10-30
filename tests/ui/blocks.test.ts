import { render } from "lit";
import { describe, expect, it } from "vitest";

import { BLOCKS, DEFAULT_ORDER } from "../../src/model/blocks.ts";
import { dayCardView } from "../../src/model/day-view.ts";
import { emptyText, homeworkList } from "../../src/ui/blocks.ts";
import { present } from "../fake-hass.ts";
import { scenarioNamed } from "../fixtures/scenarios.ts";
import { contextOf, noHold, snapshotOf } from "../fixtures/snapshot.ts";

const item = scenarioNamed("thu-1930");
const ctx = contextOf(item);
const [group] = dayCardView(
  snapshotOf(item),
  { children: [1001], switchAt: 720, packing: [], subjectNames: [], blocks: DEFAULT_ORDER },
  ctx,
  noHold,
).groups;
const content = present(group?.children[0]?.content);

function shown(notes: Parameters<typeof homeworkList>[0]): HTMLElement {
  const container = document.createElement("div");
  render(homeworkList(notes, ctx), container);
  return container;
}

describe("a block a child has nothing for", () => {
  it("says so in the block's own words", () => {
    const drawn = BLOCKS.filter((id) => id !== "birthdays");
    expect(drawn.map((id) => emptyText(id, "none", content, ctx))).toEqual([
      "Ingen lektier i ugeplanen.",
      "Intet ekstra at huske.",
      "Intet skema i Aula.",
      "Intet i ugeplanen.",
      "Ingen begivenheder.",
    ]);
  });
});

describe("a homework note", () => {
  it("shows only the parts it has: no head without a subject or a title, no empty text", () => {
    const note = present(content.homework[0]);
    const list = shown([
      { ...note, subject: undefined, title: undefined },
      { ...note, title: "Glosetest", text: "" },
    ]);
    const [bare, titled] = list.querySelectorAll(".hw");
    expect(bare?.querySelector(".hw-head")).toBeNull();
    expect(titled?.querySelector(".hw-text")).toBeNull();
    expect(titled?.querySelector(".hw-title")?.textContent).toBe("Glosetest");
  });
});
