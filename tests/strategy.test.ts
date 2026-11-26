import { afterEach, describe, expect, it, vi } from "vitest";

import "../src/index.ts";
import {
  AulaConnectChildStrategy,
  AulaConnectStrategy,
  childSection,
  dashboard,
  registerStrategies,
} from "../src/strategy.ts";
import { AulaConnectDashboardEditor } from "../src/ui/dashboard-editor.ts";
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
      ["fravaer", "Fravær", true],
    ]);
    const [main, important, , , absence] = generated.views;
    expect(main?.sections).toEqual([
      {
        type: "grid",
        column_span: 3,
        cards: [
          { type: "custom:aula-connect-children-card" },
          { type: "custom:aula-connect-overview-card" },
        ],
      },
    ]);
    expect(important?.sections[0]?.cards).toEqual([
      { type: "custom:aula-connect-children-card", look_switch: false },
      { type: "custom:aula-connect-important-card" },
    ]);
    expect(absence?.sections[0]?.cards).toEqual([
      { type: "custom:aula-connect-children-card", look_switch: false },
      { type: "custom:aula-connect-sick-card" },
      { type: "custom:aula-connect-vacation-card" },
    ]);
  });

  it("shows the children chosen, and no Fravær without its parts", () => {
    const generated = dashboard({ children: [1002], sick: false, vacation: false }, "en");
    expect(generated.views[0]?.sections).toEqual([
      {
        type: "grid",
        column_span: 3,
        cards: [
          { type: "custom:aula-connect-children-card", children: [1002] },
          {
            type: "custom:aula-connect-overview-card",
            children: [1002],
            paths: { absence: false },
          },
        ],
      },
    ]);
    expect(generated.views.map((view) => view.title)).toEqual([
      "Aula",
      "Important",
      "Week plan",
      "Week",
    ]);
    expect(dashboard({ sick: false }, "da").views[4]?.sections[0]?.cards).toEqual([
      { type: "custom:aula-connect-children-card", look_switch: false },
      { type: "custom:aula-connect-vacation-card" },
    ]);
  });
});

describe("the dashboard's settings", () => {
  it("gives each card the settings it has, and only those", () => {
    const packing = [{ subject: "Idræt", items: ["Idrætstaske"] }];
    const people = [{ child: "1001", person: "person.ida" }];
    const generated = dashboard(
      {
        children: [1001],
        packing,
        people,
        switch_time: "15:00",
        sick_message: "{name} er syg.",
        sender: "Lise",
        pack_icons: { idrætstaske: "mdi:bag-personal" },
        size: "large",
      },
      "da",
    );
    const types = (type: string): Record<string, unknown>[] =>
      generated.views
        .flatMap((view) => view.sections.flatMap((section) => section.cards))
        .filter((item) => item.type === `custom:${type}`)
        .map((item) => ({ ...item }));
    expect(types("aula-connect-overview-card")).toEqual([
      {
        type: "custom:aula-connect-overview-card",
        children: [1001],
        switch_time: "15:00",
        packing,
        pack_icons: { idrætstaske: "mdi:bag-personal" },
        sick_message: "{name} er syg.",
        sender: "Lise",
      },
    ]);
    expect(types("aula-connect-week-card")).toEqual([
      { type: "custom:aula-connect-week-card", children: [1001], switch_time: "15:00", packing },
    ]);
    expect(types("aula-connect-sick-card")).toEqual([
      {
        type: "custom:aula-connect-sick-card",
        children: [1001],
        sick_message: "{name} er syg.",
        sender: "Lise",
      },
    ]);
    expect(types("aula-connect-vacation-card")).toEqual([
      { type: "custom:aula-connect-vacation-card", children: [1001], sender: "Lise" },
    ]);
    expect(types("aula-connect-children-card")[0]).toEqual({
      type: "custom:aula-connect-children-card",
      children: [1001],
      people,
    });
    expect(types("aula-connect-children-card")[1]).toMatchObject({ people, look_switch: false });
  });

  it("is edited in Home Assistant's own form, and suggests its title and icon", () => {
    const editor = AulaConnectStrategy.getConfigElement();
    expect(editor).toBeInstanceOf(AulaConnectDashboardEditor);
    expect(AulaConnectStrategy.getCreateSuggestions()).toEqual({
      title: "Aula",
      icon: "mdi:school-outline",
    });
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
