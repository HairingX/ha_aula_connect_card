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

describe("the week card's configuration", () => {
  it("fills in the defaults", () => {
    expect(resolveWeekConfig({ type: "custom:aula-connect-week-card" })).toEqual({
      children: [],
      switchAt: 720,
      size: "normal",
      subjectNames: [],
      packing: [],
      timetable: "compact",
      infoLines: 6,
      order: [],
      show: {},
      blocks: ALL,
      weeks: 2,
    });
  });

  it("keeps the children, shown in the order given", () => {
    expect(resolveWeekConfig({ children: [1002, 1001] }).children).toEqual([1002, 1001]);
  });

  it("refuses a child id written as text", () => {
    expect(() => resolveWeekConfig({ children: ["1001"] })).toThrow(
      new Error('children: "1001" is not a child id, which is a number such as 1001'),
    );
  });

  it("takes weeks: 1 and 2, as numbers or text", () => {
    expect(resolveWeekConfig({ weeks: 1 }).weeks).toBe(1);
    expect(resolveWeekConfig({ weeks: "2" }).weeks).toBe(2);
  });

  it("hides the blocks show turns off", () => {
    expect(resolveWeekConfig({ show: { timetable: false, birthdays: false } }).blocks).toEqual([
      "homework",
      "pack",
      "plan",
      "events",
    ]);
  });

  it("refuses show.tasks, naming the blocks", () => {
    expect(() => resolveWeekConfig({ show: { tasks: false } })).toThrow(
      new Error(
        'show: unknown block "tasks"; the blocks are homework, pack, timetable, plan, events, birthdays',
      ),
    );
  });

  it("accepts and ignores any key Home Assistant adds", () => {
    const config = resolveWeekConfig({ grid_options: { columns: 12 }, visibility: [] });
    expect(config).not.toHaveProperty("grid_options");
    expect(config.blocks).toEqual(ALL);
  });
});

describe("checking a configuration", () => {
  it.each<[unknown, string]>([
    [null, "The configuration must be a mapping"],
    [{ children: "1001" }, "children: must be a list of child ids"],
    [{ children: ["Ida"] }, 'children: "Ida" is not a child id, which is a number such as 1001'],
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
      'show: unknown block "notes"; the blocks are homework, pack, timetable, plan, events, birthdays',
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
    expect(resolveDayConfig(shared).blocks).toEqual([
      "pack",
      "homework",
      "timetable",
      "plan",
      "events",
      "birthdays",
    ]);
  });

  it("puts Husk first on a wall screen, unless order says otherwise", () => {
    expect(resolveDayConfig({ size: "large" }).blocks.slice(0, 2)).toEqual(["pack", "homework"]);
    expect(resolveWeekConfig({ size: "large" }).blocks.slice(0, 2)).toEqual(["pack", "homework"]);
    expect(resolveDayConfig({ size: "large", order: ["homework"] }).blocks.slice(0, 2)).toEqual([
      "homework",
      "pack",
    ]);
    expect(resolveDayConfig({}).blocks.slice(0, 2)).toEqual(["homework", "pack"]);
  });
});

describe("the folded timetable and plan", () => {
  it("fold the timetable and the plan's notes after six lines, unless told otherwise", () => {
    expect(resolveDayConfig({})).toMatchObject({ timetable: "compact", infoLines: 6 });
    expect(resolveDayConfig({ timetable: "full", info_lines: 0 })).toMatchObject({
      timetable: "full",
      infoLines: 0,
    });
    expect(resolveWeekConfig({ timetable: "compact", info_lines: "10" })).toMatchObject({
      timetable: "compact",
      infoLines: 10,
    });
  });

  it.each([
    [{ timetable: "short" }, "timetable: must be compact or full"],
    [{ info_lines: 51 }, "info_lines: must be a whole number from 0 to 50, not 51"],
    [{ info_lines: -1 }, "info_lines: must be a whole number from 0 to 50, not -1"],
    [{ info_lines: 2.5 }, "info_lines: must be a whole number from 0 to 50, not 2.5"],
    [{ info_lines: "six" }, 'info_lines: must be a whole number from 0 to 50, not "six"'],
    [{ info_lines: true }, "info_lines: must be a whole number from 0 to 50, not true"],
  ])("refuses %j", (config, message) => {
    expect(() => resolveDayConfig(config)).toThrow(new Error(message));
  });

  it("are chosen in the editor, the timetable from a list and the lines as a number", () => {
    rememberLanguage("en");
    const schema = dayConfigForm().schema;
    expect(schema.find((item) => item.name === "timetable")).toMatchObject({
      selector: {
        select: {
          mode: "list",
          options: [
            { value: "compact", label: "Compact – subjects and start times" },
            { value: "full", label: "Full – end times, rooms and breaks" },
          ],
        },
      },
    });
    expect(schema.find((item) => item.name === "info_lines")).toMatchObject({
      selector: { number: { min: 0, max: 50, mode: "box" } },
    });
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
      "timetable",
      "info_lines",
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
      "timetable",
      "info_lines",
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

  it("lists the children the cards have seen, by their ids as YAML has them, and nothing else", () => {
    expect(dayConfigForm().schema[0]).toEqual({
      name: "children",
      selector: { select: { multiple: true, mode: "list", options: [] } },
    });
    rememberChildren(CHILDREN);
    expect(dayConfigForm().schema[0]).toEqual({
      name: "children",
      selector: {
        select: {
          multiple: true,
          mode: "list",
          options: [
            { value: 1001, label: "Ida · Bakkedal Skole" },
            { value: 1002, label: "Oskar · Bakkedal Skole" },
          ],
        },
      },
    });
  });

  // Home Assistant's radio list turns its value into text, ticks the option equal to that, and
  // gives back the ticked option's value.
  const radioTicks = (field: FormSchema | undefined, value: unknown): unknown[] => {
    const select = field && "selector" in field ? field.selector.select : undefined;
    const options = (select as { options?: readonly { value: unknown }[] } | undefined)?.options;
    const text = typeof value === "number" ? String(value) : value;
    return (options ?? []).map((option) => option.value).filter((option) => option === text);
  };

  it("ticks the weeks the card shows, written as a number or as text, and reads what it gives back", () => {
    rememberChildren(CHILDREN);
    const form = weekConfigForm();
    const weeks = form.schema.find((item) => item.name === "weeks");
    for (const value of [1, "1", 2, "2"]) {
      expect(() => {
        form.assertConfig({ weeks: value });
      }).not.toThrow();
      const shown = resolveWeekConfig({ weeks: value }).weeks;
      expect(radioTicks(weeks, value)).toEqual([String(shown)]);
      expect(resolveWeekConfig({ weeks: radioTicks(weeks, value)[0] }).weeks).toBe(shown);
    }
  });

  it("gives every list of single choices text values, which is all Home Assistant's radio list ticks", () => {
    rememberChildren(CHILDREN);
    const lists = [dayConfigForm(), weekConfigForm(), homeworkConfigForm()]
      .flatMap((form) => form.schema)
      .flatMap((field) => {
        const select = "selector" in field ? field.selector.select : undefined;
        const list = select as
          { mode?: string; multiple?: boolean; options: readonly { value: unknown }[] } | undefined;
        return list?.mode === "list" && list.multiple !== true
          ? [{ name: field.name, options: list.options }]
          : [];
      });
    expect(lists.map((list) => list.name)).toEqual([
      "timetable",
      "size",
      "weeks",
      "timetable",
      "size",
      "size",
    ]);
    for (const list of lists) {
      for (const option of list.options) expect(typeof option.value).toBe("string");
    }
  });

  it("shows only what it can show as the card does, and says how to write the rest", () => {
    rememberChildren(CHILDREN);
    const form = weekConfigForm();
    expect(() => {
      form.assertConfig({ children: [1001], weeks: 1, switch_time: "07:30" });
    }).not.toThrow();
    expect(() => {
      form.assertConfig({ children: ["1001"] });
    }).toThrow('children: "1001" is not a child id, which is a number such as 1001');
    expect(() => {
      form.assertConfig({ switch_time: 720 });
    }).toThrow('switch_time: write the time as "12:00" to set it here');
    expect(() => {
      form.assertConfig({ switch_time: "12" });
    }).toThrow('switch_time: write the time as "12:00" to set it here');
    expect(form.schema[1]).toMatchObject({
      selector: { select: { options: [{ value: "1" }, { value: "2" }] } },
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

  it("shows a switch for each block, on by default", () => {
    const show = dayConfigForm().schema.find((item) => item.name === "show");
    expect(show).toMatchObject({ type: "expandable", flatten: false });
    expect(show && "schema" in show ? show.schema : []).toEqual(
      ALL.map((name) => ({ name, default: true, selector: { boolean: {} } })),
    );
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
      "Resten følger standardrækkefølgen: Lektier, Husk, Skema, Dagens plan, Begivenheder; med stor tekst Husk først.",
    );
    expect(da.computeLabel({ name: "timetable", selector: { boolean: {} } })).toBe("Skema");
    expect(da.computeLabel({ name: "timetable", selector: { select: {} } })).toBe(
      "Skemaets visning",
    );
    expect(da.computeLabel({ name: "info_lines" })).toBe("Linjer i dagens plan før Vis mere");
    expect(da.computeHelper({ name: "timetable", selector: { select: {} } })).toBe(
      "Standard: kort.",
    );
    expect(da.computeHelper({ name: "info_lines" })).toBe(
      "Standard: 6. 0 viser altid hele teksten.",
    );
    expect(da.computeHelper({ name: "show" })).toBeUndefined();
    expect(da.computeLabel({ name: "packing" })).toBe("Fag og ting");
    expect(da.computeLabel({ name: "subject_names" })).toBe("Egne navne");
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
    expect(en.computeLabel({ name: "packing" })).toBe("Subjects and things");
    expect(en.computeLabel({ name: "subject_names" })).toBe("Your names");
    expect(en.schema.find((item) => item.name === "packing_group")).toMatchObject({
      title: "Things to bring",
    });
  });

  it("labels every field, as Home Assistant shows the key's name in place of an empty label", () => {
    rememberChildren(CHILDREN);
    const fieldsOf = (schema: readonly FormSchema[]): FormSchema[] =>
      schema.flatMap((field) => ("schema" in field ? fieldsOf(field.schema) : [field]));
    for (const form of [dayConfigForm(), weekConfigForm(), homeworkConfigForm()]) {
      for (const field of fieldsOf(form.schema)) {
        expect(form.computeLabel(field), field.name).toBeTruthy();
      }
    }
  });

  it("gives a block's switch no help of the field it shares its name with", () => {
    const form = dayConfigForm();
    expect(form.computeHelper({ name: "timetable", selector: { boolean: {} } })).toBeUndefined();
    expect(form.computeLabel({ name: "timetable", selector: { boolean: {} } })).toBe("Timetable");
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
