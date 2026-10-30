import { afterEach, describe, expect, it } from "vitest";

import {
  forget,
  rememberChildren,
  rememberLanguage,
  rememberSubjects,
} from "../../src/core/memory.ts";
import { parseSwitchTime } from "../../src/config/common.ts";
import { dayConfigForm, resolveDayConfig } from "../../src/config/day.ts";
import { homeworkConfigForm, resolveHomeworkConfig } from "../../src/config/homework.ts";
import { resolveWeekConfig, weekConfigForm } from "../../src/config/week.ts";
import type { FormSchema } from "../../src/config/form.ts";
import { CHILDREN } from "../fixtures/week.ts";

afterEach(() => {
  forget();
});

const ALL = ["homework", "pack", "timetable", "plan", "events", "birthdays"];

describe("0.0.2's week card configurations", () => {
  it("keep working as the week card, with the defaults filled in", () => {
    expect(resolveWeekConfig({ type: "custom:aula-connect-card" })).toEqual({
      children: [],
      switchAt: 720,
      size: "normal",
      subjectNames: [],
      packing: [],
      order: [],
      show: {},
      blocks: ALL,
      weeks: 2,
    });
  });

  it("keep the children, shown in the order given", () => {
    expect(resolveWeekConfig({ children: [1002, "1001"] }).children).toEqual([1002, 1001]);
  });

  it("keep weeks: 1 and 2, as numbers or text", () => {
    expect(resolveWeekConfig({ weeks: 1 }).weeks).toBe(1);
    expect(resolveWeekConfig({ weeks: "2" }).weeks).toBe(2);
  });

  it("keep show.timetable, events and birthdays", () => {
    expect(resolveWeekConfig({ show: { timetable: false, birthdays: false } }).blocks).toEqual([
      "homework",
      "pack",
      "plan",
      "events",
    ]);
  });

  it("hide homework and the plan with show.tasks: false, unless their own switch says", () => {
    expect(resolveWeekConfig({ show: { tasks: false } }).blocks).toEqual([
      "pack",
      "timetable",
      "events",
      "birthdays",
    ]);
    expect(resolveWeekConfig({ show: { tasks: false, homework: true } }).blocks).toContain(
      "homework",
    );
  });

  it("show everything with the show 0.0.2's stub wrote in full", () => {
    const show = { timetable: true, tasks: true, events: true, birthdays: true };
    expect(resolveWeekConfig({ show }).blocks).toEqual(ALL);
  });

  it("accept and ignore sections, and any key Home Assistant adds", () => {
    const config = resolveWeekConfig({
      sections: [{ title: "Prøver", text: "prøve" }],
      grid_options: { columns: 12 },
      visibility: [],
    });
    expect(config).not.toHaveProperty("sections");
    expect(config.blocks).toEqual(ALL);
  });
});

describe("checking a configuration", () => {
  it.each<[unknown, string]>([
    [null, "The configuration must be a mapping"],
    [{ children: "1001" }, "children: must be a list of child ids"],
    [{ children: ["Ida"] }, 'children: "Ida" is not a child id'],
    [{ weeks: 3 }, "weeks: must be 1 or 2, not 3"],
    [{ size: "huge" }, "size: must be normal or large"],
    [{ switch_time: "25:00" }, 'switch_time: "25:00" is not a time; write it as "12:00"'],
    [{ switch_time: true }, "switch_time: true is not a time"],
    [{ order: "timetable" }, "order: must be a list of blocks"],
    [
      { order: ["timetable", "pack", "lunch"] },
      'order[2]: unknown block "lunch"; the blocks are homework, pack, timetable, plan, events, birthdays',
    ],
    [{ show: [] }, "show: must be a mapping of blocks to true or false"],
    [
      { show: { notes: false } },
      'show: unknown block "notes"; the blocks are homework, pack, timetable, plan, events, birthdays, tasks',
    ],
    [{ show: { timetable: "no" } }, "show.timetable: must be true or false"],
    [{ packing: [{ subject: "Idræt" }] }, "packing[0].items: must name at least one thing"],
    [{ packing: [{ items: ["Tøj"] }] }, "packing[0].subject: must be a subject"],
    [{ packing: [{ subject: "Idræt", items: [3] }] }, "packing[0].items: must be things to bring"],
    [{ packing: ["Idræt"] }, "packing[0]: must be a mapping"],
    [
      { packing: [{ subject: "Idræt", item: "Tøj" }] },
      'packing[0]: unknown key "item"; the keys are subject and items',
    ],
    [{ subject_names: [{ aula: "UUV" }] }, "subject_names[0].name: must be a name"],
    [{ subject_names: [{ name: "Bevægelse" }] }, "subject_names[0].aula: must be a lesson title"],
  ])("refuses %j: %s", (config, message) => {
    expect(() => resolveWeekConfig(config)).toThrow(message);
  });

  it("drops repeated blocks and counts emptied editor fields as absent", () => {
    const config = resolveDayConfig({
      order: ["plan", "plan", "", null, "homework"],
      show: { events: null },
      switch_time: "",
      size: null,
      packing: [{ subject: " Idræt ", items: ["Idrætstøj", "", null] }],
      subject_names: null,
    });
    expect(config.order).toEqual(["plan", "homework"]);
    expect(config.show).toEqual({});
    expect(config.switchAt).toBe(720);
    expect(config.size).toBe("normal");
    expect(config.packing).toEqual([{ subject: "Idræt", items: ["Idrætstøj"] }]);
  });

  it("takes one text as one thing to bring", () => {
    expect(
      resolveDayConfig({ packing: [{ subject: "Svømning", items: "Badetøj" }] }).packing,
    ).toEqual([{ subject: "Svømning", items: ["Badetøj"] }]);
  });

  it("gives every card the shared keys", () => {
    const shared = { children: [1001], switch_time: "07:30", size: "large" };
    expect(resolveHomeworkConfig({ ...shared, packing: [] })).toMatchObject({
      children: [1001],
      switchAt: 450,
      size: "large",
    });
    expect(resolveDayConfig(shared).blocks).toEqual(ALL);
  });
});

describe("the switch time", () => {
  it.each<[unknown, number | null]>([
    [undefined, 720],
    [null, 720],
    ["", 720],
    ["12:00", 720],
    ["12.00", 720],
    ["9:05", 545],
    ["12:00:30", 720],
    ["00:00", null],
    ["00:00:00", null],
    [0, null],
    [12, 720],
    [23, 1380],
    [60, 60],
    [720, 720],
    [1439, 1439],
    [3600, 60],
    [43_200, 720],
    [86_399, 1439],
    ["12", 720],
    [" 7 ", 420],
    ["0", null],
  ])("reads %j as %j", (value, minutes) => {
    expect(parseSwitchTime(value)).toBe(minutes);
  });

  it.each([
    ["12:60"],
    ["24:00"],
    ["24"],
    ["noon"],
    [24],
    [59],
    [1440],
    [3599],
    [86_400],
    [-1],
    [12.5],
  ])("refuses %j, saying how to write a time the editor can show", (value) => {
    expect(() => parseSwitchTime(value)).toThrow(
      new Error(`switch_time: ${JSON.stringify(value)} is not a time; write it as "12:00"`),
    );
  });
});

describe("rows the editor is still filling in", () => {
  const unfinished = {
    packing: [
      { subject: "Idræt", items: [] },
      { subject: "", items: ["Tøj"] },
      { subject: "Svømning", items: ["Badetøj"] },
    ],
    subject_names: [{ aula: "UUV" }, { name: "Bevægelse" }, { aula: "IDR", name: "Idræt" }],
  };

  it("are left out for the editor, which stays", () => {
    expect(resolveDayConfig(unfinished, true)).toMatchObject({
      packing: [{ subject: "Svømning", items: ["Badetøj"] }],
      subjectNames: [{ aula: "IDR", name: "Idræt" }],
    });
    expect(() => {
      dayConfigForm().assertConfig(unfinished);
    }).not.toThrow();
  });

  it("are said by the card itself, with what they lack", () => {
    expect(() => resolveDayConfig({ packing: unfinished.packing })).toThrow(
      "packing[0].items: must name at least one thing",
    );
    expect(() => resolveDayConfig({ subject_names: unfinished.subject_names })).toThrow(
      "subject_names[0].name: must be a name",
    );
  });

  it("still refuse what is not a row", () => {
    expect(() => resolveDayConfig({ packing: ["Idræt"] }, true)).toThrow(
      "packing[0]: must be a mapping",
    );
  });
});

describe("the editor", () => {
  const names = (schema: readonly FormSchema[]): string[] => schema.map((item) => item.name);

  it("gives each card its fields, top to bottom", () => {
    expect(names(dayConfigForm().schema)).toEqual([
      "children",
      "order",
      "show",
      "switch_time",
      "size",
      "packing_group",
      "subject_names_group",
    ]);
    expect(names(weekConfigForm().schema)).toEqual([
      "children",
      "weeks",
      "order",
      "show",
      "switch_time",
      "size",
      "packing_group",
      "subject_names_group",
    ]);
    expect(names(homeworkConfigForm().schema)).toEqual([
      "children",
      "switch_time",
      "size",
      "subject_names_group",
    ]);
  });

  it("lists the children the cards have seen by their ids as YAML has them, or takes ids typed in", () => {
    expect(dayConfigForm().schema[0]).toMatchObject({
      selector: { select: { mode: "dropdown", custom_value: true, options: [] } },
    });
    expect(() => {
      dayConfigForm().assertConfig({ children: ["1001"] });
    }).not.toThrow();
    rememberChildren(CHILDREN);
    expect(dayConfigForm().schema[0]).toMatchObject({
      selector: {
        select: {
          mode: "list",
          custom_value: false,
          options: [
            { value: 1001, label: "Ida · Bakkedal Skole" },
            { value: 1002, label: "Oskar · Bakkedal Skole" },
          ],
        },
      },
    });
  });

  it("shows only what it can show as the card does, and says how to write the rest", () => {
    rememberChildren(CHILDREN);
    const form = weekConfigForm();
    expect(() => {
      form.assertConfig({ children: [1001], weeks: 1, switch_time: "07:30" });
    }).not.toThrow();
    expect(() => {
      form.assertConfig({ children: ["1001"] });
    }).toThrow("children: write the child ids as numbers, such as [1001], to choose here");
    expect(() => {
      form.assertConfig({ weeks: "2" });
    }).toThrow("weeks: write 1 or 2 without quotes to choose here");
    expect(() => {
      form.assertConfig({ switch_time: 720 });
    }).toThrow('switch_time: write the time as "12:00" to set it here');
    expect(() => {
      form.assertConfig({ switch_time: "12" });
    }).toThrow('switch_time: write the time as "12:00" to set it here');
    expect(form.schema[1]).toMatchObject({
      selector: { select: { options: [{ value: 1 }, { value: 2 }] } },
    });
  });

  it("offers the subjects seen, written out, for the things to bring and the names", () => {
    rememberSubjects(["IDR", "DAN", "Lejrskole", " "], ["Dansk", "Musik", ""]);
    const form = dayConfigForm();
    const packing = form.schema.find((item) => item.name === "packing_group");
    expect(JSON.stringify(packing)).toContain('"options":["Dansk","Idræt","Lejrskole","Musik"]');
    const subjectNames = form.schema.find((item) => item.name === "subject_names_group");
    expect(JSON.stringify(subjectNames)).toContain('"options":["DAN","IDR","Lejrskole"]');
  });

  it("shows the blocks on by default, and 0.0.2's switch only where it is set", () => {
    const show = dayConfigForm().schema.find((item) => item.name === "show");
    const hidden = (name: string) => ({
      condition: "or",
      conditions: [
        { field: "tasks", operator: "not_eq", value: false },
        { field: name, operator: "exists" },
      ],
    });
    expect(show).toMatchObject({
      type: "expandable",
      flatten: false,
      schema: [
        ...ALL.map((name) => ({
          name,
          default: true,
          selector: { boolean: {} },
          ...(name === "homework" || name === "plan" ? { visible: hidden(name) } : {}),
        })),
        { name: "tasks", visible: { field: "tasks", operator: "exists" } },
      ],
    });
  });

  it("moves blocks, but not birthdays, which the header says", () => {
    const order = dayConfigForm().schema.find((item) => item.name === "order");
    expect(JSON.stringify(order)).not.toContain('"birthdays"');
  });

  it("labels and explains the fields in Danish and English", () => {
    rememberLanguage("da");
    const da = weekConfigForm();
    expect(da.computeLabel({ name: "order" })).toBe("Flyt en blok øverst");
    expect(da.computeHelper({ name: "order" })).toContain(
      "Resten følger standardrækkefølgen: Lektier, Husk, Skema, Dagens plan, Begivenheder.",
    );
    expect(da.computeLabel({ name: "timetable" })).toBe("Skema");
    expect(da.computeLabel({ name: "tasks" })).toBe("Lektier og noter (tidligere indstilling)");
    expect(da.computeLabel({ name: "packing" })).toBe("");
    expect(da.computeLabel({ name: "unknown" })).toBeUndefined();
    expect(da.computeHelper({ name: "switch_time" })).toBe(
      "Tomt felt = 12.00. Før dette klokkeslæt vises i dag; 00.00 viser i dag hele dagen.",
    );
    expect(da.computeHelper({ name: "weeks" })).toBe("Standard: to uger.");
    expect(da.computeHelper({ name: "size" })).toBe("Standard: normal.");
    expect(da.schema.find((item) => item.name === "show")).toMatchObject({
      title: "Vis og skjul blokke",
    });
    rememberLanguage("en");
    const en = weekConfigForm();
    expect(en.computeLabel({ name: "switch_time" })).toBe("Show the next school day from");
    expect(en.schema.find((item) => item.name === "packing_group")).toMatchObject({
      title: "Things to bring",
    });
  });

  it("checks a configuration with the card's own rules", () => {
    expect(() => {
      dayConfigForm().assertConfig({ order: ["lunch"] });
    }).toThrow('order[0]: unknown block "lunch"');
    expect(() => {
      homeworkConfigForm().assertConfig({ order: ["lunch"] });
    }).not.toThrow();
  });
});
