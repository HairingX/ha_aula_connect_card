import { afterEach, describe, expect, it } from "vitest";

import {
  CHILDREN_CARD,
  DEFAULT_PATHS,
  familyForm,
  IMPORTANT_CARD,
  OVERVIEW_CARD,
  parseFlag,
  parseLookSettings,
  parseLook,
  parsePackIcons,
  parsePaths,
  parsePeople,
  parseSickThreads,
  parseText,
  resolveActionConfig,
  resolveChildrenConfig,
  resolveImportantConfig,
  resolveOverviewConfig,
  SICK_CARD,
  VACATION_CARD,
  type FamilyCard,
} from "../../src/config/family.ts";
import type { FormSchema } from "../../src/config/form.ts";
import type { Thread } from "../../src/core/types.ts";
import {
  forget,
  rememberChildren,
  rememberLanguage,
  rememberThreads,
} from "../../src/core/memory.ts";
import { SECOND_ENTRY, THREADS } from "../fixtures/family.ts";
import { CHILDREN } from "../fixtures/week.ts";

afterEach(() => {
  forget();
});

describe("the family's cards' configuration", () => {
  it("fills in the defaults", () => {
    expect(resolveChildrenConfig({})).toMatchObject({ children: [], people: [], lookSwitch: true });
    expect(resolveOverviewConfig({})).toMatchObject({
      look: undefined,
      paths: DEFAULT_PATHS,
      packIcons: {},
      sickMessage: undefined,
      sender: undefined,
    });
    expect(resolveImportantConfig({})).toMatchObject({ children: [], size: "normal" });
    expect(resolveActionConfig({ sick_message: " ", sender: "" })).toMatchObject({
      sickMessage: undefined,
      sender: undefined,
    });
  });

  it("reads what is set", () => {
    expect(
      resolveChildrenConfig({
        people: [
          { child: "1001", person: " person.lille_ida " },
          { child: 1002, person: "person.oskar" },
        ],
        look_switch: false,
      }),
    ).toMatchObject({
      people: [
        { child: 1001, person: "person.lille_ida" },
        { child: 1002, person: "person.oskar" },
      ],
      lookSwitch: false,
    });
    expect(
      resolveOverviewConfig({
        look: "board",
        paths: { important: " /aula/vigtigt ", week: null, absence: false },
        pack_icons: { " Fløjte ": " mdi:music-note " },
        sick_message: " {name} er syg. ",
        sender: "Peter Testesen",
      }),
    ).toMatchObject({
      look: "board",
      paths: { important: "/aula/vigtigt", weekplan: "ugeplan", week: "uge", absence: null },
      packIcons: { fløjte: "mdi:music-note" },
      sickMessage: "{name} er syg.",
      sender: "Peter Testesen",
    });
  });

  it.each([
    [() => parsePeople("x"), "people: must be a list of children and people"],
    [() => parsePeople(["x"]), "people[0]: must be a mapping of child and person"],
    [
      () => parsePeople([{ child: "Ida", person: "person.ida" }]),
      "people[0].child: must be a child id, such as 1001",
    ],
    [
      () => parsePeople([{ child: 1001, person: "sensor.ida" }]),
      "people[0].person: must be a person, such as person.ida",
    ],
    [
      () => parsePeople([{ child: 1001 }]),
      "people[0].person: must be a person, such as person.ida",
    ],
    [() => parseLook("grid"), "look: must be rows, columns or board"],
    [() => parseLookSettings("full", "rows"), "rows: must be a mapping of its settings"],
    [
      () => parseLookSettings({ important: "all" }, "board"),
      "board.important: must be list or button",
    ],
    [
      () => parseLookSettings({ clock: "round" }, "board"),
      "board.clock: must be digital or analog",
    ],
    [
      () => parseLookSettings({ clock: "analog" }, "rows"),
      'rows: unknown key "clock"; the keys are important, important_max',
    ],
    [
      () => parseLookSettings({ important_max: 100 }, "columns"),
      "columns.important_max: must be a whole number from 1 to 99",
    ],
    [
      () => parseLookSettings({ important_max: "3" }, "board"),
      "board.important_max: must be a whole number from 1 to 99",
    ],
    [() => parseSickThreads("501"), "sick_threads: must be a list of children and threads"],
    [() => parseSickThreads([501]), "sick_threads[0]: must be a mapping of child and thread"],
    [
      () => parseSickThreads([{ child: "Ida", thread: 501 }]),
      "sick_threads[0].child: must be a child id, such as 1001",
    ],
    [
      () => parseSickThreads([{ child: 1001, thread: "Sygdom" }]),
      "sick_threads[0].thread: must be a thread's id, such as 12345",
    ],
    [
      () => parseSickThreads([{ child: 1001, thread: 0 }]),
      "sick_threads[0].thread: must be a thread's id, such as 12345",
    ],
    [() => parseFlag("no", "sick_write"), "sick_write: must be true or false"],
    [() => parseFlag("yes", "look_switch"), "look_switch: must be true or false"],
    [
      () => parsePaths("vigtigt"),
      "paths: must be a mapping of important, weekplan, week and absence",
    ],
    [
      () => parsePaths({ events: "x" }),
      'paths: unknown key "events"; the keys are important, weekplan, week and absence',
    ],
    [
      () => parsePaths({ week: 3 }),
      "paths.week: must be a view's path, or false to leave the tile out",
    ],
    [() => parsePackIcons("x"), "pack_icons: must be a list of things and icons"],
    [() => parsePackIcons(["x"]), "pack_icons[0]: must be a mapping of thing and icon"],
    [
      () => parsePackIcons([{ icon: "mdi:bike" }]),
      "pack_icons[0].thing: must be a thing to bring, such as Idrætstaske",
    ],
    [
      () => parsePackIcons([{ thing: "Cykel", icon: "bike" }]),
      "pack_icons[0]: must be an icon, such as mdi:tshirt-crew-outline",
    ],
    [
      () => parsePackIcons({ fløjte: "music" }),
      "pack_icons.fløjte: must be an icon, such as mdi:tshirt-crew-outline",
    ],
    [
      () => parsePackIcons({ fløjte: 3 }),
      "pack_icons.fløjte: must be an icon, such as mdi:tshirt-crew-outline",
    ],
    [() => parseText(3, "sender"), "sender: must be a text"],
  ])("names what is wrong: %#", (parse, message) => {
    expect(parse).toThrow(message);
  });

  it("lists the next three important notes unless set otherwise", () => {
    expect(resolveOverviewConfig({})).toMatchObject({
      rows: { important: "list", max: 3 },
      columns: { important: "list", max: 3 },
      board: { important: "list", max: 3, clock: "digital" },
    });
    expect(
      resolveOverviewConfig({
        rows: { important: "list", important_max: 99 },
        board: { important: "button", clock: "analog" },
        columns: null,
      }),
    ).toMatchObject({
      rows: { important: "list", max: 99 },
      columns: { important: "list", max: 3 },
      board: { important: "button", max: 3, clock: "analog" },
    });
    expect(
      parsePackIcons(
        [
          { thing: "Cykel", icon: "mdi:bicycle" },
          { thing: "", icon: "" },
        ],
        true,
      ),
    ).toEqual({ cykel: "mdi:bicycle" });
  });

  it("reads each child's thread as numbers, whether written as text or not", () => {
    expect(parseSickThreads(null)).toEqual([]);
    expect(
      parseSickThreads([
        { child: "1001", thread: "501" },
        { child: 1002, thread: 77 },
      ]),
    ).toEqual([
      { child: 1001, thread: 501 },
      { child: 1002, thread: 77 },
    ]);
    expect(parseSickThreads([{ child: "1001" }, { child: 1002, thread: 77 }], true)).toEqual([
      { child: 1002, thread: 77 },
    ]);
    expect(resolveActionConfig({}).sickWrite).toBe(true);
    expect(resolveActionConfig({ sick_write: false }).sickWrite).toBe(false);
  });

  it("leaves out a person the editor is still filling in", () => {
    expect(parsePeople([{ child: "1001" }, { child: 1002, person: "person.oskar" }], true)).toEqual(
      [{ child: 1002, person: "person.oskar" }],
    );
  });
});

describe("the family's cards' editor", () => {
  const names = (schema: readonly FormSchema[]): string[] => schema.map((item) => item.name);

  it.each<[FamilyCard, string[]]>([
    [CHILDREN_CARD, ["children", "people", "look_switch", "size"]],
    [
      OVERVIEW_CARD,
      [
        "children",
        "look",
        "rows",
        "columns",
        "board",
        "switch_time",
        "size",
        "sick_write",
        "sick_message",
        "sick_threads",
        "sender",
        "packing_group",
        "subject_names_group",
      ],
    ],
    [IMPORTANT_CARD, ["children", "size", "subject_names_group"]],
    [SICK_CARD, ["children", "sick_write", "sick_message", "sick_threads", "sender", "size"]],
    [VACATION_CARD, ["children", "sender", "size"]],
  ])("shows %s's fields, each labelled", (card, fields) => {
    rememberChildren(CHILDREN);
    const form = familyForm(card);
    expect(names(form.schema)).toEqual(fields);
    const fieldsOf = (schema: readonly FormSchema[]): FormSchema[] =>
      schema.flatMap((field) => ("schema" in field ? fieldsOf(field.schema) : [field]));
    for (const field of fieldsOf(form.schema)) {
      expect(form.computeLabel(field), field.name).toBeTruthy();
    }
  });

  it("offers each child's threads that can be replied in, a shared one once", () => {
    rememberChildren(CHILDREN);
    const [open, closed] = THREADS.threads as [Thread, Thread];
    rememberThreads(1001, THREADS.threads);
    rememberThreads(1002, [
      open,
      closed,
      { ...open, thread_id: 9, subject: "Klassen", employees: [] },
    ]);
    const field = familyForm(SICK_CARD).schema.find((item) => item.name === "sick_threads");
    const options = (
      field as unknown as {
        selector: {
          object: { fields: { thread: { selector: { select: { options: unknown } } } } };
        };
      }
    ).selector.object.fields.thread.selector.select.options;
    expect(options).toEqual([
      { value: "501", label: "Ida, Oskar · Sygdom 3.B · Karen Lund" },
      { value: "9", label: "Oskar · Klassen" },
    ]);
  });

  it("offers the children and the guardians the integration lists", () => {
    rememberLanguage("da");
    rememberChildren([...CHILDREN, ...SECOND_ENTRY]);
    const form = familyForm(CHILDREN_CARD);
    expect(form.schema.find((item) => item.name === "people")).toMatchObject({
      selector: {
        object: {
          fields: {
            child: {
              selector: {
                select: {
                  options: [
                    { value: "1001", label: "Ida" },
                    { value: "1002", label: "Oskar" },
                    { value: "1001", label: "Ida" },
                    { value: "1002", label: "Oskar" },
                  ],
                },
              },
            },
            person: { selector: { entity: { filter: { domain: "person" } } } },
          },
        },
      },
    });
    expect(familyForm(SICK_CARD).schema.find((item) => item.name === "sender")).toMatchObject({
      selector: { select: { options: ["Lise Testesen", "Peter Testesen"], custom_value: true } },
    });
    expect(familyForm(OVERVIEW_CARD).computeHelper({ name: "look" })).toBeTruthy();
  });

  it("checks a configuration with the card's own rules, letting an unfinished person be", () => {
    const form = familyForm(CHILDREN_CARD);
    expect(() => {
      form.assertConfig({ people: [{ child: "1001" }] });
    }).not.toThrow();
    expect(() => {
      familyForm(OVERVIEW_CARD).assertConfig({ look: "grid" });
    }).toThrow("look: must be rows, columns or board");
  });
});
