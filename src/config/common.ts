/**
 * The configuration keys the cards share: how each is checked, and its default. An error names
 * the key and what it must be; Home Assistant shows it as an error card, and the visual editor
 * falls back to YAML with it.
 *
 * @packageDocumentation
 */

import { BLOCKS, orderBlocks, type BlockId, type ShowConfig } from "../model/blocks.ts";
import type { PackRule } from "../model/pack.ts";
import type { SubjectName } from "../model/subjects.ts";

/** The switch time when none is configured: noon, in minutes since midnight. */
export const DEFAULT_SWITCH = 12 * 60;

/** What every card's configuration resolves to. */
export interface CommonConfig {
  /** The child ids to show; every child when empty. */
  readonly children: readonly number[];
  /** The switch time in minutes since midnight; null to keep today in focus all day. */
  readonly switchAt: number | null;
  /** `large` makes everything 1.5 times as big, for a wall screen. */
  readonly size: "normal" | "large";
  /** Names for subjects, over the built-in ones. */
  readonly subjectNames: readonly SubjectName[];
  /** The things to bring when a subject is on the timetable. */
  readonly packing: readonly PackRule[];
}

/** The keys of a card that shows a day's blocks. */
export interface BlocksConfig {
  /** The blocks shown first, in this order. */
  readonly order: readonly BlockId[];
  /** Which blocks are shown. */
  readonly show: ShowConfig;
  /** The blocks shown, in order. */
  readonly blocks: readonly BlockId[];
}

/** Tells whether a value is a mapping, as YAML writes one. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The visual editor writes an emptied field as an empty text or null.
function absent(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function list(value: unknown, name: string, what: string): unknown[] {
  if (absent(value)) return [];
  if (!Array.isArray(value)) throw new Error(`${name}: must be a list of ${what}`);
  return value as unknown[];
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** Checks the configuration is a mapping. */
export function configRecord(config: unknown): Record<string, unknown> {
  if (!isRecord(config)) throw new Error("The configuration must be a mapping");
  return config;
}

/** Reads `children`: child ids, as numbers or digits. */
export function parseChildren(value: unknown): number[] {
  return list(value, "children", "child ids").map((item) => {
    const id = typeof item === "string" && /^\d+$/.test(item.trim()) ? Number(item.trim()) : item;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0) {
      throw new Error(`children: ${JSON.stringify(item)} is not a child id`);
    }
    return id;
  });
}

/**
 * Reads `switch_time`: "HH:MM", "HH.MM" or "HH:MM:SS", seconds ignored, or "HH", a whole hour;
 * or a whole number: 0 to 23 an hour, 60 to 1439 minutes after midnight, as YAML 1.1 reads an
 * unquoted 12:00 (720), and 3600 to 86399 seconds, as it reads 12:00:00 (43200). Midnight turns
 * the switch off.
 */
export function parseSwitchTime(value: unknown): number | null {
  if (absent(value)) return DEFAULT_SWITCH;
  let minutes: number | undefined;
  if (typeof value === "string") {
    const match = /^(\d{1,2})(?:[:.](\d{2})(?::(\d{2}))?)?$/.exec(value.trim());
    if (match) {
      const hours = Number(match[1]);
      const mins = Number(match[2] ?? 0);
      if (hours < 24 && mins < 60 && Number(match[3] ?? 0) < 60) minutes = hours * 60 + mins;
    }
  } else if (typeof value === "number" && Number.isSafeInteger(value)) {
    if (value >= 0 && value < 24) minutes = value * 60;
    else if (value >= 60 && value < 1440) minutes = value;
    else if (value >= 3600 && value < 86_400) minutes = Math.floor(value / 60);
  }
  if (minutes === undefined) {
    throw new Error(`switch_time: ${JSON.stringify(value)} is not a time; write it as "12:00"`);
  }
  return minutes === 0 ? null : minutes;
}

/** Reads `size`. */
export function parseSize(value: unknown): "normal" | "large" {
  if (absent(value)) return "normal";
  if (value !== "normal" && value !== "large") throw new Error("size: must be normal or large");
  return value;
}

/** Reads `weeks`: 1 or 2, as a number or text. */
export function parseWeeks(value: unknown): 1 | 2 {
  if (absent(value)) return 2;
  const number = typeof value === "string" ? Number(value) : value;
  if (number !== 1 && number !== 2) {
    throw new Error(`weeks: must be 1 or 2, not ${JSON.stringify(value)}`);
  }
  return number;
}

function isBlock(value: unknown): value is BlockId {
  return (BLOCKS as readonly unknown[]).includes(value);
}

/** Reads `order`: block ids, each once. */
export function parseOrder(value: unknown): BlockId[] {
  const result: BlockId[] = [];
  list(value, "order", "blocks").forEach((item, index) => {
    if (absent(item)) return;
    if (!isBlock(item)) {
      throw new Error(
        `order[${String(index)}]: unknown block ${JSON.stringify(item)}; the blocks are ${BLOCKS.join(", ")}`,
      );
    }
    if (!result.includes(item)) result.push(item);
  });
  return result;
}

const SHOW_KEYS: readonly string[] = [...BLOCKS, "tasks"];

/** Reads `show`: blocks to true or false, and 0.0.2's `tasks` for homework and the plan. */
export function parseShow(value: unknown): ShowConfig {
  if (absent(value)) return {};
  if (!isRecord(value)) throw new Error("show: must be a mapping of blocks to true or false");
  const result: Partial<Record<BlockId | "tasks", boolean>> = {};
  for (const [key, flag] of Object.entries(value)) {
    if (!SHOW_KEYS.includes(key)) {
      throw new Error(`show: unknown block "${key}"; the blocks are ${SHOW_KEYS.join(", ")}`);
    }
    if (flag === null || flag === undefined) continue;
    if (typeof flag !== "boolean") throw new Error(`show.${key}: must be true or false`);
    result[key as BlockId | "tasks"] = flag;
  }
  return result;
}

function entry(value: unknown, name: string, keys: readonly string[]): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${name}: must be a mapping`);
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      throw new Error(`${name}: unknown key "${key}"; the keys are ${keys.join(" and ")}`);
    }
  }
  return value;
}

// A row of the editor's list still being filled in: what it lacks is left out, while the editor
// stays, and the card itself says what is missing.
function unfinished(missing: boolean, lenient: boolean, message: string): boolean {
  if (missing && !lenient) throw new Error(message);
  return missing;
}

/**
 * Reads `packing`: subjects and the things to bring for them, as a list or one text. `lenient`
 * leaves out a row without a subject or a thing, as the editor has while one is being added.
 */
export function parsePacking(value: unknown, lenient = false): PackRule[] {
  return list(value, "packing", "subjects and things").flatMap((item, index) => {
    const name = `packing[${String(index)}]`;
    const rule = entry(item, name, ["subject", "items"]);
    const subject = text(rule.subject);
    const raw =
      typeof rule.items === "string" ? [rule.items] : list(rule.items, `${name}.items`, "things");
    const items = raw
      .filter((thing) => !absent(thing))
      .map((thing) => {
        const value = text(thing);
        if (value === undefined) throw new Error(`${name}.items: must be things to bring`);
        return value;
      });
    if (unfinished(subject === undefined, lenient, `${name}.subject: must be a subject`)) return [];
    if (unfinished(items.length === 0, lenient, `${name}.items: must name at least one thing`))
      return [];
    return [{ subject: subject ?? "", items }];
  });
}

/**
 * Reads `subject_names`: lesson titles in Aula, and the names to show for them. `lenient` leaves
 * out a row without either, as the editor has while one is being added.
 */
export function parseSubjectNames(value: unknown, lenient = false): SubjectName[] {
  return list(value, "subject_names", "names").flatMap((item, index) => {
    const name = `subject_names[${String(index)}]`;
    const names = entry(item, name, ["aula", "name"]);
    const aula = text(names.aula);
    const shown = text(names.name);
    if (unfinished(aula === undefined, lenient, `${name}.aula: must be a lesson title`)) return [];
    if (unfinished(shown === undefined, lenient, `${name}.name: must be a name`)) return [];
    return [{ aula: aula ?? "", name: shown ?? "" }];
  });
}

/**
 * Reads the keys every card has. Keys the card does not know are left to Home Assistant.
 * `lenient` leaves out the rows the editor is still filling in.
 */
export function resolveCommon(config: Record<string, unknown>, lenient = false): CommonConfig {
  return {
    children: parseChildren(config.children),
    switchAt: parseSwitchTime(config.switch_time),
    size: parseSize(config.size),
    subjectNames: parseSubjectNames(config.subject_names, lenient),
    packing: parsePacking(config.packing, lenient),
  };
}

/** Reads `order` and `show`, and the blocks they give. */
export function resolveBlocks(config: Record<string, unknown>): BlocksConfig {
  const order = parseOrder(config.order);
  const show = parseShow(config.show);
  return { order, show, blocks: orderBlocks(order, show) };
}
