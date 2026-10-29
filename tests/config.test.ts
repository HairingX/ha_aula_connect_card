import { describe, expect, it } from "vitest";

import { defaultSections, resolveConfig, stubConfig } from "../src/config";

describe("resolveConfig", () => {
  it("fills in every default for a bare configuration", () => {
    expect(resolveConfig({ type: "custom:aula-connect-card" })).toEqual({
      children: [],
      weeks: 2,
      show: { timetable: true, tasks: true, events: true, birthdays: true },
      sections: undefined,
    });
  });

  it("takes child ids as numbers and as text from the visual editor", () => {
    expect(resolveConfig({ type: "x", children: [1001, " 1002 "] }).children).toEqual([1001, 1002]);
  });

  it("treats children set to null as every child", () => {
    expect(resolveConfig({ type: "x", children: null }).children).toEqual([]);
  });

  it.each([[[1.5]], [[-1]], [["abc"]], [[true]]])("refuses %j as children", (children) => {
    expect(() => resolveConfig({ type: "x", children })).toThrow(/is not a child id/);
  });

  it("refuses children that are not a list", () => {
    expect(() => resolveConfig({ type: "x", children: 1001 })).toThrow("children: must be a list");
  });

  it.each([
    [1, 1],
    [2, 2],
    ["1", 1],
    ["2", 2],
  ])("takes weeks %j", (weeks, expected) => {
    expect(resolveConfig({ type: "x", weeks }).weeks).toBe(expected);
  });

  it.each([[0], [3], ["two"], [null]])("refuses weeks %j", (weeks) => {
    expect(() => resolveConfig({ type: "x", weeks })).toThrow(/weeks: must be 1 or 2/);
  });

  it("switches off the parts set to false and keeps the others", () => {
    expect(resolveConfig({ type: "x", show: { tasks: false } }).show).toEqual({
      timetable: true,
      tasks: false,
      events: true,
      birthdays: true,
    });
  });

  it("refuses show that is not a mapping", () => {
    expect(() => resolveConfig({ type: "x", show: ["tasks"] })).toThrow(/show: must be a mapping/);
  });

  it("refuses an unknown part", () => {
    expect(() => resolveConfig({ type: "x", show: { lunch: true } })).toThrow(
      'show: unknown part "lunch"',
    );
  });

  it("refuses a part that is not true or false", () => {
    expect(() => resolveConfig({ type: "x", show: { tasks: "yes" } })).toThrow(
      "show.tasks: must be true or false",
    );
  });

  it("keeps sections and leaves out fields the editor emptied", () => {
    expect(
      resolveConfig({
        type: "x",
        sections: [
          { title: "Tests", text: "test", subject: "", type: null, icon: undefined },
          { title: "All" },
        ],
      }).sections,
    ).toEqual([{ title: "Tests", text: "test" }, { title: "All" }]);
  });

  it("takes an empty list of sections as the defaults", () => {
    expect(resolveConfig({ type: "x", sections: [] }).sections).toBeUndefined();
  });

  it("refuses sections that are not a list", () => {
    expect(() => resolveConfig({ type: "x", sections: { title: "A" } })).toThrow(
      "sections: must be a list",
    );
  });

  it.each([
    [["Lektier"], "sections[0]: must be a mapping"],
    [[{ title: "A", colour: "red" }], 'sections[0]: unknown key "colour"'],
    [[{ title: "A", type: 1 }], "sections[0].type: must be text"],
    [[{ type: "task" }], "sections[0]: needs a title"],
    [[{ title: "A" }, { title: "  " }], "sections[1]: needs a title"],
  ])("refuses sections %j", (sections, message) => {
    expect(() => resolveConfig({ type: "x", sections })).toThrow(message);
  });

  it.each([[null], ["custom:aula-connect-card"], [[]]])(
    "refuses %j as a configuration",
    (config) => {
      expect(() => resolveConfig(config)).toThrow("The configuration must be a mapping");
    },
  );
});

describe("defaultSections", () => {
  it("names homework and the day's plan in Danish", () => {
    expect(defaultSections("da")).toEqual([
      { title: "Lektier", icon: "mdi:book-open-variant", type: "task" },
      { title: "Dagens plan", icon: "mdi:clipboard-text-outline", type: "comment" },
    ]);
  });

  it("names them in English for any other language", () => {
    expect(defaultSections("fr").map((section) => section.title)).toEqual([
      "Homework",
      "Today's plan",
    ]);
  });
});

describe("stubConfig", () => {
  it("is a valid configuration showing everything", () => {
    const config = stubConfig();
    expect(config.type).toBe("custom:aula-connect-card");
    expect(resolveConfig(config).show).toEqual({
      timetable: true,
      tasks: true,
      events: true,
      birthdays: true,
    });
  });

  it("leaves the sections out, so that the defaults apply and follow their changes", () => {
    expect(stubConfig()).not.toHaveProperty("sections");
    expect(resolveConfig(stubConfig()).sections).toBeUndefined();
  });
});
