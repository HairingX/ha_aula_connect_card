/**
 * The visual editor, as schemas for Home Assistant's own form. Home Assistant builds the form
 * without `hass` or the configuration, so the choices come from what the cards on the page have
 * seen: the children, the language, and the subjects.
 *
 * @packageDocumentation
 */

import {
  knownChildren,
  knownLessonTitles,
  knownNoteSubjects,
  rememberedLanguage,
} from "../core/memory.ts";
import { translator, type TextKey, type Translate } from "../core/i18n.ts";
import { BLOCKS, type BlockId } from "../model/blocks.ts";
import { subjectNamer } from "../model/subjects.ts";
import { isRecord } from "./common.ts";

/** A field or group of Home Assistant's form, as far as the cards use them. */
export type FormSchema =
  | {
      readonly name: string;
      readonly required?: boolean;
      readonly default?: unknown;
      readonly visible?: Readonly<Record<string, unknown>>;
      readonly selector: Readonly<Record<string, unknown>>;
    }
  | {
      readonly name: string;
      readonly type: "expandable";
      readonly title: string;
      readonly icon?: string;
      readonly flatten: boolean;
      readonly schema: readonly FormSchema[];
    };

/** What a card's static `getConfigForm` returns. */
export interface ConfigForm {
  /** The form's fields, top to bottom. */
  readonly schema: readonly FormSchema[];
  /** Returns a field's label; Home Assistant's own when undefined. */
  readonly computeLabel: (schema: { name: string }) => string | undefined;
  /** Returns a field's help text, if any; an expandable's becomes a paragraph in it. */
  readonly computeHelper: (schema: { name: string }) => string | undefined;
  /** Throws for a configuration the form cannot edit, with the reason: the card's own check. */
  readonly assertConfig: (config: unknown) => void;
}

/** The block names in the editor. */
export const BLOCK_LABELS: Readonly<Record<BlockId, TextKey>> = {
  homework: "blockHomework",
  pack: "blockPack",
  timetable: "blockTimetable",
  plan: "blockPlan",
  events: "blockEvents",
  birthdays: "blockBirthdays",
};

const LABELS: Readonly<Record<string, TextKey | "">> = {
  children: "editorChildren",
  weeks: "editorWeeks",
  order: "editorOrder",
  ...BLOCK_LABELS,
  tasks: "editorTasks",
  switch_time: "editorSwitch",
  size: "editorSize",
  // Inside their groups, whose titles name them.
  packing: "",
  subject_names: "",
};

const HELPERS: Readonly<Record<string, TextKey>> = {
  children: "editorChildrenHelper",
  weeks: "editorWeeksHelper",
  order: "editorOrderHelper",
  switch_time: "editorSwitchHelper",
  size: "editorSizeHelper",
  packing_group: "editorPackingHelper",
  subject_names_group: "editorSubjectNamesHelper",
};

// The switches of homework and the plan stand for themselves, unless 0.0.2's `tasks: false`
// hides both and no switch of their own says otherwise.
const notHiddenByTasks = (name: string): Readonly<Record<string, unknown>> => ({
  condition: "or",
  conditions: [
    { field: "tasks", operator: "not_eq", value: false },
    { field: name, operator: "exists" },
  ],
});

/** The editor's fields, by name. */
export type FieldName =
  | "children"
  | "weeks"
  | "order"
  | "show"
  | "switch_time"
  | "size"
  | "packing_group"
  | "subject_names_group";

function fields(t: Translate): Record<FieldName, FormSchema> {
  const children = knownChildren();
  const known = children.length > 0;
  const namer = subjectNamer([]);
  const subjects = [
    ...new Set([...knownLessonTitles().map((title) => namer(title).name), ...knownNoteSubjects()]),
  ].sort((a, b) => a.localeCompare(b, "da"));
  return {
    children: {
      name: "children",
      selector: {
        select: {
          multiple: true,
          mode: known ? "list" : "dropdown",
          custom_value: !known,
          // Numbers, as YAML has them: Home Assistant ticks the option equal to the value.
          options: children.map((child) => ({
            value: child.child_id,
            label: `${child.first_name} · ${child.institution_name}`,
          })),
        },
      },
    },
    weeks: {
      name: "weeks",
      selector: {
        select: {
          mode: "list",
          options: [
            { value: 1, label: t("editorWeeksOne") },
            { value: 2, label: t("editorWeeksTwo") },
          ],
        },
      },
    },
    order: {
      name: "order",
      selector: {
        select: {
          multiple: true,
          reorder: true,
          // Birthdays are said in the day's header, never as a block that could move.
          options: BLOCKS.filter((id) => id !== "birthdays").map((id) => ({
            value: id,
            label: t(BLOCK_LABELS[id]),
          })),
        },
      },
    },
    show: {
      name: "show",
      type: "expandable",
      flatten: false,
      title: t("editorShow"),
      icon: "mdi:eye-outline",
      schema: [
        ...BLOCKS.map((id) => ({
          name: id,
          default: true,
          selector: { boolean: {} },
          ...(id === "homework" || id === "plan" ? { visible: notHiddenByTasks(id) } : {}),
        })),
        // 0.0.2's switch, shown only where a configuration still has it.
        {
          name: "tasks",
          visible: { field: "tasks", operator: "exists" },
          selector: { boolean: {} },
        },
      ],
    },
    switch_time: { name: "switch_time", selector: { time: { no_second: true } } },
    size: {
      name: "size",
      selector: {
        select: {
          mode: "list",
          options: [
            { value: "normal", label: t("editorSizeNormal") },
            { value: "large", label: t("editorSizeLarge") },
          ],
        },
      },
    },
    packing_group: {
      name: "packing_group",
      type: "expandable",
      flatten: true,
      title: t("editorPacking"),
      icon: "mdi:bag-personal-outline",
      schema: [
        {
          name: "packing",
          selector: {
            object: {
              multiple: true,
              label_field: "subject",
              description_field: "items",
              fields: {
                subject: {
                  label: t("editorPackingSubject"),
                  required: true,
                  selector: { select: { mode: "dropdown", custom_value: true, options: subjects } },
                },
                items: {
                  label: t("editorPackingItems"),
                  required: true,
                  selector: { text: { multiple: true } },
                },
              },
            },
          },
        },
      ],
    },
    subject_names_group: {
      name: "subject_names_group",
      type: "expandable",
      flatten: true,
      title: t("editorSubjectNames"),
      icon: "mdi:school-outline",
      schema: [
        {
          name: "subject_names",
          selector: {
            object: {
              multiple: true,
              label_field: "name",
              description_field: "aula",
              fields: {
                aula: {
                  label: t("editorSubjectAula"),
                  required: true,
                  selector: {
                    select: { mode: "dropdown", custom_value: true, options: knownLessonTitles() },
                  },
                },
                name: { label: t("editorSubjectName"), required: true, selector: { text: {} } },
              },
            },
          },
        },
      ],
    },
  };
}

/**
 * Throws for what the form would show other than the card does: Home Assistant ticks only an
 * option equal to the value, and the time field shows only a time written as one.
 */
function assertShown(config: unknown, known: boolean): void {
  const raw = isRecord(config) ? config : {};
  const children = Array.isArray(raw.children) ? (raw.children as unknown[]) : [];
  if (known && children.some((id) => typeof id === "string")) {
    throw new Error("children: write the child ids as numbers, such as [1001], to choose here");
  }
  if (typeof raw.weeks === "string") {
    throw new Error("weeks: write 1 or 2 without quotes to choose here");
  }
  if (typeof raw.switch_time === "number") {
    throw new Error('switch_time: write the time as "12:00" to set it here');
  }
}

/**
 * Returns a card's form: the named fields, in order, checked by the card's own `resolve`, which
 * leaves out the rows the editor is still filling in.
 */
export function configForm(
  names: readonly FieldName[],
  resolve: (config: unknown, lenient: boolean) => unknown,
): ConfigForm {
  const t = translator(rememberedLanguage());
  const all = fields(t);
  return {
    schema: names.map((name) => all[name]),
    computeLabel: (schema) => {
      const key = LABELS[schema.name];
      return key === undefined ? undefined : key === "" ? "" : t(key);
    },
    computeHelper: (schema) => {
      const key = HELPERS[schema.name];
      return key === undefined ? undefined : t(key);
    },
    assertConfig: (config) => {
      resolve(config, true);
      assertShown(config, knownChildren().length > 0);
    },
  };
}
