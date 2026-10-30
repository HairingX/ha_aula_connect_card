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
import { configRecord } from "./common.ts";

/** A field or group of Home Assistant's form, as far as the cards use them. */
export type FormSchema =
  | {
      /** The configuration key the field edits. */
      readonly name: string;
      /** Whether the field must have a value. */
      readonly required?: boolean;
      /** The value shown while the key is absent. */
      readonly default?: unknown;
      /** When the field is shown, as Home Assistant's form conditions say. */
      readonly visible?: Readonly<Record<string, unknown>>;
      /** Home Assistant's selector of the field. */
      readonly selector: Readonly<Record<string, unknown>>;
    }
  | {
      /** The group's name; with `flatten`, its fields are the configuration's own. */
      readonly name: string;
      /** A group that opens and closes. */
      readonly type: "expandable";
      /** The group's title. */
      readonly title: string;
      /** The group's mdi icon. */
      readonly icon?: string;
      /** Whether the group's fields edit the configuration itself, not a mapping in it. */
      readonly flatten: boolean;
      /** The group's fields. */
      readonly schema: readonly FormSchema[];
    };

/** What a card's static `getConfigForm` returns. */
export interface ConfigForm {
  /** The form's fields, top to bottom. */
  readonly schema: readonly FormSchema[];
  /** Returns a field's label; Home Assistant's own when undefined. */
  readonly computeLabel: (schema: {
    name: string;
    selector?: Readonly<Record<string, unknown>>;
  }) => string | undefined;
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
  tasks: "editorTasks",
  timetable: "editorTimetable",
  info_lines: "editorInfoLines",
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
  timetable: "editorTimetableHelper",
  info_lines: "editorInfoLinesHelper",
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
  | "timetable"
  | "info_lines"
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
          // Numbers, as YAML has them: Home Assistant's checkboxes tick the option equal to it.
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
          // Text: Home Assistant's radio list turns the value into text before it ticks the option
          // equal to it, and gives back text.
          options: [
            { value: "1", label: t("editorWeeksOne") },
            { value: "2", label: t("editorWeeksTwo") },
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
    timetable: {
      name: "timetable",
      selector: {
        select: {
          mode: "list",
          options: [
            { value: "compact", label: t("editorTimetableCompact") },
            { value: "full", label: t("editorTimetableFull") },
          ],
        },
      },
    },
    info_lines: { name: "info_lines", selector: { number: { min: 0, max: 50, mode: "box" } } },
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
 * Throws for what the form would show other than the card does: Home Assistant's checkboxes tick
 * only an option equal to the value, and its time field shows only a time written as one.
 */
function assertShown(raw: Record<string, unknown>, known: boolean): void {
  const children = Array.isArray(raw.children) ? (raw.children as unknown[]) : [];
  if (known && children.some((id) => typeof id === "string")) {
    throw new Error("children: write the child ids as numbers, such as [1001], to choose here");
  }
  // The time field shows only a time with its minutes.
  if (typeof raw.switch_time === "number" || /^\s*\d+\s*$/.test(String(raw.switch_time))) {
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
      // A block's switch shares its name with a field of its own, such as the timetable's.
      const block = schema.selector && "boolean" in schema.selector;
      const key = block
        ? (BLOCK_LABELS as Readonly<Record<string, TextKey | undefined>>)[schema.name]
        : undefined;
      const label = key ?? LABELS[schema.name];
      return label === undefined ? undefined : label === "" ? "" : t(label);
    },
    computeHelper: (schema) => {
      const key = HELPERS[schema.name];
      return key === undefined ? undefined : t(key);
    },
    assertConfig: (config) => {
      resolve(config, true);
      assertShown(configRecord(config), knownChildren().length > 0);
    },
  };
}
