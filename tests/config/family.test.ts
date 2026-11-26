import { afterEach, describe, expect, it } from "vitest";

import {
  CHILDREN_CARD,
  DEFAULT_PATHS,
  familyForm,
  IMPORTANT_CARD,
  OVERVIEW_CARD,
  parseFlag,
  parseLook,
  parsePackIcons,
  parsePaths,
  parsePeople,
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
import { forget, rememberChildren, rememberLanguage } from "../../src/core/memory.ts";
import { SECOND_ENTRY } from "../fixtures/family.ts";
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
    [() => parsePackIcons(["x"]), "pack_icons: must be a mapping of things to icons"],
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
        "switch_time",
        "size",
        "sick_message",
        "sender",
        "packing_group",
        "subject_names_group",
      ],
    ],
    [IMPORTANT_CARD, ["children", "size", "subject_names_group"]],
    [SICK_CARD, ["children", "sick_message", "sender", "size"]],
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
