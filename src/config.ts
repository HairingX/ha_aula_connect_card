/**
 * The card's configuration: its shape, its defaults and its validation.
 *
 * @packageDocumentation
 */

import { translator } from "./core/i18n.ts";

/** The parts of the card that can be switched off. */
export const SHOW_KEYS = ["timetable", "tasks", "events", "birthdays"] as const;

/** A part of the card that can be switched off. */
export type ShowKey = (typeof SHOW_KEYS)[number];

/** A section of the week plan's notes, and the rule that puts a note in it. */
export interface SectionConfig {
  /** The heading of the section. */
  title: string;
  /** An mdi icon, such as `mdi:book-open-variant`. */
  icon?: string;
  /** The note's type is this, ignoring case. */
  type?: string;
  /** The note's subject is this, ignoring case. */
  subject?: string;
  /** The note's title contains this, ignoring case. */
  text?: string;
}

/** The configuration as written in YAML or by the visual editor. */
export interface CardConfig {
  /** `custom:aula-connect-card`. */
  type: string;
  /** The child ids to show; every child when left out or empty. */
  children?: (number | string)[];
  /** 1 for this week, 2 for this and next week. */
  weeks?: number | string;
  /** The parts to show; every part when left out. */
  show?: Partial<Record<ShowKey, boolean>>;
  /** The sections of the week plan's notes; the defaults when left out or empty. */
  sections?: SectionConfig[];
}

/** The configuration with its defaults filled in. */
export interface ResolvedConfig {
  /** The child ids to show; every child when empty. */
  children: number[];
  /** 1 for this week, 2 for this and next week. */
  weeks: 1 | 2;
  /** Whether each part is shown. */
  show: Record<ShowKey, boolean>;
  /** The configured sections; undefined, for none, means the defaults of the display language. */
  sections: SectionConfig[] | undefined;
}

const SECTION_KEYS = ["title", "icon", "type", "subject", "text"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown, name: string): unknown[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new Error(`${name}: must be a list`);
  return value as unknown[];
}

function childId(value: unknown): number {
  const id = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0) {
    throw new Error(`children: ${JSON.stringify(value)} is not a child id`);
  }
  return id;
}

function weeks(value: unknown): 1 | 2 {
  if (value === undefined) return 2;
  const number = typeof value === "string" ? Number(value) : value;
  if (number !== 1 && number !== 2) {
    throw new Error(`weeks: must be 1 or 2, not ${JSON.stringify(value)}`);
  }
  return number;
}

function show(value: unknown): Record<ShowKey, boolean> {
  const result: Record<ShowKey, boolean> = {
    timetable: true,
    tasks: true,
    events: true,
    birthdays: true,
  };
  if (value === undefined) return result;
  if (!isRecord(value)) throw new Error("show: must be a mapping of parts to true or false");
  for (const [key, flag] of Object.entries(value)) {
    if (!(SHOW_KEYS as readonly string[]).includes(key)) {
      throw new Error(`show: unknown part "${key}"; the parts are ${SHOW_KEYS.join(", ")}`);
    }
    if (typeof flag !== "boolean") throw new Error(`show.${key}: must be true or false`);
    result[key as ShowKey] = flag;
  }
  return result;
}

function section(value: unknown, index: number): SectionConfig {
  if (!isRecord(value)) throw new Error(`sections[${String(index)}]: must be a mapping`);
  const result: SectionConfig = { title: "" };
  for (const [key, field] of Object.entries(value)) {
    if (!(SECTION_KEYS as readonly string[]).includes(key)) {
      throw new Error(`sections[${String(index)}]: unknown key "${key}"`);
    }
    // The visual editor writes an emptied field as an empty string or null.
    if (field === undefined || field === null || field === "") continue;
    if (typeof field !== "string") {
      throw new Error(`sections[${String(index)}].${key}: must be text`);
    }
    result[key as (typeof SECTION_KEYS)[number]] = field;
  }
  if (result.title.trim() === "") throw new Error(`sections[${String(index)}]: needs a title`);
  return result;
}

/**
 * Checks a configuration and fills in its defaults.
 *
 * @throws Error naming the first invalid setting, which Home Assistant shows as an error card.
 */
export function resolveConfig(config: unknown): ResolvedConfig {
  if (!isRecord(config)) throw new Error("The configuration must be a mapping");
  const sections = list(config.sections, "sections");
  return {
    children: (list(config.children, "children") ?? []).map(childId),
    weeks: weeks(config.weeks),
    show: show(config.show),
    sections: sections?.length ? sections.map(section) : undefined,
  };
}

/**
 * Returns the default sections in a display language: homework, and the teacher's plan for the
 * day, which the week plan gives as notes of type `comment`.
 */
export function defaultSections(language: string | undefined): SectionConfig[] {
  const t = translator(language);
  return [
    { title: t("sectionHomework"), icon: "mdi:book-open-variant", type: "task" },
    { title: t("sectionPlan"), icon: "mdi:clipboard-text-outline", type: "comment" },
  ];
}

/**
 * Returns a configuration that works as it is. It names no sections, so that the defaults of the
 * display language apply.
 */
export function stubConfig(): CardConfig {
  return {
    type: "custom:aula-connect-card",
    show: { timetable: true, tasks: true, events: true, birthdays: true },
  };
}
