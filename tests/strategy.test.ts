import { afterEach, describe, expect, it, vi } from "vitest";

import "../src/index.ts";
import {
  AulaConnectChildStrategy,
  AulaConnectStrategy,
  childSection,
  dashboard,
  registerStrategies,
} from "../src/strategy.ts";
import { CHILDREN } from "./fixtures/week.ts";
import { fakeHass } from "./fake-hass.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the dashboard", () => {
  it("is defined and listed as a dashboard and a section strategy", () => {
    expect(customElements.get("ll-strategy-dashboard-aula-connect")).toBe(AulaConnectStrategy);
    expect(customElements.get("ll-strategy-section-aula-connect-child")).toBe(
      AulaConnectChildStrategy,
    );
    expect(window.customStrategies?.map((entry) => [entry.type, entry.strategyType])).toEqual([
      ["aula-connect", "dashboard"],
      ["aula-connect-child", "section"],
    ]);
    expect(registerStrategies()).toBe(false);
  });

  it("has the overview's view and its pages, each under the children's bar", async () => {
    const generated = await AulaConnectStrategy.generate({}, { language: "da" });
    expect(generated.title).toBe("Aula");
    expect(generated.views.map((view) => [view.path, view.title, view.subview ?? false])).toEqual([
      ["aula", "Aula", false],
      ["vigtigt", "Vigtigt", true],
      ["ugeplan", "Ugeplan", true],
      ["uge", "Uge", true],
    ]);
    const [main, important] = generated.views;
    expect(main?.sections).toEqual([
      {
        type: "grid",
        column_span: 2,
        cards: [
          { type: "custom:aula-connect-children-card" },
          { type: "custom:aula-connect-overview-card" },
        ],
      },
      {
        type: "grid",
        cards: [
          { type: "custom:aula-connect-sick-card" },
          { type: "custom:aula-connect-vacation-requests-card" },
          { type: "custom:aula-connect-vacation-card" },
        ],
      },
    ]);
    expect(important?.sections[0]?.cards).toEqual([
      { type: "custom:aula-connect-children-card", look_switch: false },
      { type: "custom:aula-connect-important-card" },
    ]);
  });

  it("shows the children chosen, without the cards that act when told", () => {
    const generated = dashboard({ children: [1002], sick: false, vacation: false }, "en");
    expect(generated.views[0]?.sections).toEqual([
      {
        type: "grid",
        column_span: 2,
        cards: [
          { type: "custom:aula-connect-children-card", children: [1002] },
          { type: "custom:aula-connect-overview-card", children: [1002] },
        ],
      },
    ]);
    expect(generated.views[1]?.title).toBe("Important");
    expect(dashboard({ sick: false }, "da").views[0]?.sections[1]?.cards).toHaveLength(2);
  });
});

describe("a child's section", () => {
  it("has the child's name, school day and week plan, and reporting it sick", async () => {
    const hass = fakeHass({ children: CHILDREN });
    await expect(AulaConnectChildStrategy.generate({ child_id: 1002 }, hass)).resolves.toEqual({
      type: "grid",
      cards: [
        { type: "heading", heading: "Oskar", heading_style: "title" },
        { type: "custom:aula-connect-day-card", children: [1002] },
        { type: "custom:aula-connect-weekplan-card", children: [1002] },
        { type: "custom:aula-connect-sick-card", children: [1002] },
      ],
    });
  });

  it("has no name without the child listed", async () => {
    const hass = fakeHass({ childrenError: new Error("down") });
    const section = await childSection({ child_id: "1001" }, hass);
    expect(section.cards[0]).toEqual({ type: "custom:aula-connect-day-card", children: [1001] });
  });

  it("names a child id that is none", async () => {
    await expect(childSection({}, fakeHass())).rejects.toThrow(
      "child_id: must be a child id, such as 1001",
    );
  });
});
