import { beforeEach, describe, expect, it } from "vitest";

import { configForm, rememberChildren, rememberLanguage, type FormSchema } from "../src/editor";
import { CHILDREN } from "./fixtures/week";

function field(name: string): FormSchema | undefined {
  return configForm().schema.find((item) => item.name === name);
}

beforeEach(() => {
  rememberChildren([]);
  rememberLanguage("en");
});

describe("configForm", () => {
  it("lets child ids be typed in while no card has listed the children", () => {
    expect(field("children")).toEqual({
      name: "children",
      selector: { select: { multiple: true, mode: "dropdown", custom_value: true, options: [] } },
    });
  });

  it("offers the children a card has listed, by first name and institution", () => {
    rememberChildren(CHILDREN);
    expect(field("children")).toEqual({
      name: "children",
      selector: {
        select: {
          multiple: true,
          mode: "list",
          custom_value: false,
          options: [
            { value: "1001", label: "Ida · Bakkedal Skole" },
            { value: "1002", label: "Oskar · Bakkedal Skole" },
          ],
        },
      },
    });
  });

  it("offers this week, or this and next week", () => {
    rememberLanguage("da");
    expect(field("weeks")).toEqual({
      name: "weeks",
      selector: {
        select: {
          mode: "list",
          options: [
            { value: "1", label: "Denne uge" },
            { value: "2", label: "Denne og næste uge" },
          ],
        },
      },
    });
  });

  it("has a switch for each part, under show", () => {
    expect(field("show")).toMatchObject({
      type: "expandable",
      flatten: false,
      schema: ["timetable", "tasks", "events", "birthdays"].map((name) => ({
        name,
        selector: { boolean: {} },
      })),
    });
  });

  it("edits the sections as a list of title, icon and rules", () => {
    expect(field("sections")).toMatchObject({
      selector: {
        object: {
          multiple: true,
          label_field: "title",
          fields: {
            title: { required: true },
            icon: { selector: { icon: {} } },
            type: {},
            subject: {},
            text: {},
          },
        },
      },
    });
  });

  it("labels and explains the fields in the language the cards were shown in", () => {
    rememberLanguage("da");
    const form = configForm();
    expect(form.computeLabel({ name: "children" })).toBe("Børn");
    expect(form.computeLabel({ name: "tasks" })).toBe("Lektier og noter");
    expect(form.computeLabel({ name: "unknown" })).toBeUndefined();
    expect(form.computeHelper({ name: "weeks" })).toBe("Standard: denne og næste uge.");
    expect(form.computeHelper({ name: "show" })).toBeUndefined();
  });

  it("checks a configuration as the card does", () => {
    const form = configForm();
    expect(() => {
      form.assertConfig({ type: "custom:aula-connect-card", weeks: 3 });
    }).toThrow(/weeks/);
    expect(() => {
      form.assertConfig({ type: "custom:aula-connect-card" });
    }).not.toThrow();
  });
});
