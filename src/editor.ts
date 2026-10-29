/**
 * The card's visual editor, as a schema for Home Assistant's own form. The form is built without
 * a `hass` object, so the children and the language come from what the cards on the page last
 * saw.
 *
 * @packageDocumentation
 */

import { resolveConfig, SHOW_KEYS } from "./config";
import { translator, type TextKey } from "./i18n";
import type { Child } from "./types";

const seen: { children: Child[]; language: string | undefined } = {
  children: [],
  language: undefined,
};

/** Remembers the children a card has listed, for the editor's choice of children. */
export function rememberChildren(children: Child[]): void {
  seen.children = children;
}

/** Remembers the language a card is shown in, for the editor's labels. */
export function rememberLanguage(language: string): void {
  seen.language = language;
}

/** A schema of Home Assistant's form, as far as the card uses it. */
export type FormSchema =
  | { name: string; required?: boolean; selector: Record<string, unknown> }
  | { name: string; type: "expandable"; title: string; flatten?: false; schema: FormSchema[] };

/** What the static `getConfigForm` of a card returns. */
export interface ConfigForm {
  /** The form's fields. */
  schema: FormSchema[];
  /** Returns a field's label; Home Assistant's own when undefined. */
  computeLabel: (schema: { name: string }) => string | undefined;
  /** Returns a field's help text, if any. */
  computeHelper: (schema: { name: string }) => string | undefined;
  /** Throws for a configuration the form cannot edit. */
  assertConfig: (config: unknown) => void;
}

const LABELS: Partial<Record<string, TextKey>> = {
  children: "editorChildren",
  weeks: "editorWeeks",
  timetable: "timetable",
  tasks: "tasks",
  events: "events",
  birthdays: "birthdays",
  sections: "editorSections",
};

const HELPERS: Partial<Record<string, TextKey>> = {
  children: "editorChildrenHelper",
  weeks: "editorWeeksHelper",
  sections: "editorSectionsHelper",
};

/** Returns the card's form for Home Assistant's visual editor. */
export function configForm(): ConfigForm {
  const t = translator(seen.language);
  const lookup = (keys: Partial<Record<string, TextKey>>, name: string): string | undefined => {
    const key = keys[name];
    return key && t(key);
  };
  const known = seen.children.length > 0;
  const text = { text: {} };
  return {
    schema: [
      {
        name: "children",
        selector: {
          select: {
            multiple: true,
            mode: known ? "list" : "dropdown",
            custom_value: !known,
            options: seen.children.map((child) => ({
              value: String(child.child_id),
              label: `${child.first_name} · ${child.institution_name}`,
            })),
          },
        },
      },
      {
        name: "weeks",
        selector: {
          select: {
            mode: "list",
            options: [
              { value: "1", label: t("editorWeeksThis") },
              { value: "2", label: t("editorWeeksBoth") },
            ],
          },
        },
      },
      {
        name: "show",
        type: "expandable",
        title: t("editorShow"),
        flatten: false,
        schema: SHOW_KEYS.map((name) => ({ name, selector: { boolean: {} } })),
      },
      {
        name: "sections",
        selector: {
          object: {
            multiple: true,
            label_field: "title",
            fields: {
              title: { label: t("editorSectionTitle"), required: true, selector: text },
              icon: { label: t("editorSectionIcon"), selector: { icon: {} } },
              type: { label: t("editorSectionType"), selector: text },
              subject: { label: t("editorSectionSubject"), selector: text },
              text: { label: t("editorSectionText"), selector: text },
            },
          },
        },
      },
    ],
    computeLabel: (schema) => lookup(LABELS, schema.name),
    computeHelper: (schema) => lookup(HELPERS, schema.name),
    assertConfig: (config) => {
      resolveConfig(config);
    },
  };
}
