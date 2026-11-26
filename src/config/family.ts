/**
 * The configuration of the family's cards: the children's bar, the overview, the Important page,
 * and the cards that act on Aula for the family.
 *
 * @packageDocumentation
 */

import { LOOKS, type Look } from "../core/selection.ts";
import { configRecord, isRecord, resolveCommon, type CommonConfig } from "./common.ts";
import { configForm, type ConfigForm, type FieldName } from "./form.ts";

/** The children's bar's element. */
export const CHILDREN_CARD = "aula-connect-children-card";
/** The overview's element. */
export const OVERVIEW_CARD = "aula-connect-overview-card";
/** The Important page's element. */
export const IMPORTANT_CARD = "aula-connect-important-card";
/** The card that reports a child sick. */
export const SICK_CARD = "aula-connect-sick-card";
/** Ferie/fri: the vacations and the vacation requests. */
export const VACATION_CARD = "aula-connect-vacation-card";

/** A person whose name and picture stand in for a child's. */
export interface PersonFor {
  /** The child's id. */
  readonly child: number;
  /** The `person` entity. */
  readonly person: string;
}

/**
 * The views the overview's tiles go to, relative to the dashboard unless they begin with "/";
 * null for a tile left out.
 */
export interface Paths {
  /** The Important page. */
  readonly important: string | null;
  /** The week plan. */
  readonly weekplan: string | null;
  /** The week. */
  readonly week: string | null;
  /** Fravær: sickness, vacations and vacation requests. */
  readonly absence: string | null;
}

/** Fravær's icon, on the overview's tile and the dashboard's view. */
export const ABSENCE_ICON = "mdi:calendar-account-outline";

/** The views the dashboard strategy makes, and the overview goes to by default. */
export const DEFAULT_PATHS: { readonly [key in keyof Paths]: string } = {
  important: "vigtigt",
  weekplan: "ugeplan",
  week: "uge",
  absence: "fravaer",
};

/** The children's bar's configuration. */
export interface ChildrenBarConfig extends CommonConfig {
  /** People standing in for children. */
  readonly people: readonly PersonFor[];
  /** Whether the bar has the switch between the overview's looks. */
  readonly lookSwitch: boolean;
}

/** The overview's configuration. */
export interface OverviewConfig extends ActionConfig {
  /** The look, where the card keeps one of its own; undefined to follow the children's bar. */
  readonly look: Look | undefined;
  /** The views its tiles go to. */
  readonly paths: Paths;
  /** Icons for things to bring, by the thing, over the built-in ones. */
  readonly packIcons: Readonly<Record<string, string>>;
  /** Whether what is important is said in a line that opens it, or shown for its first day in full. */
  readonly important: "compact" | "full";
}

/** The thread a child's illness is written about in. */
export interface SickThread {
  /** The child's id. */
  readonly child: number;
  /** Aula's id of the thread. */
  readonly thread: number;
}

/** The configuration of the cards that act on Aula: the sick, vacation and requests cards. */
export interface ActionConfig extends CommonConfig {
  /** The message about the illness, `{name}` standing for the child's first name. */
  readonly sickMessage: string | undefined;
  /** The thread each child's illness is written about in, over the one last written in. */
  readonly sickThreads: readonly SickThread[];
  /** Whether a report goes on to writing a message, rather than offering it. */
  readonly sickWrite: boolean;
  /** The guardian to act as, by the name Aula Connect gives the entry; undefined for the last used. */
  readonly sender: string | undefined;
}

// The visual editor writes an emptied field as an empty text or null.
function absent(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** Reads `people`: children and the `person` entities standing in for them. */
export function parsePeople(value: unknown, lenient = false): PersonFor[] {
  if (absent(value)) return [];
  if (!Array.isArray(value)) throw new Error("people: must be a list of children and people");
  return (value as unknown[]).flatMap((item, index) => {
    const name = `people[${String(index)}]`;
    if (!isRecord(item)) throw new Error(`${name}: must be a mapping of child and person`);
    const child = typeof item.child === "string" ? Number(item.child) : item.child;
    const person = typeof item.person === "string" ? item.person.trim() : "";
    if (
      typeof child !== "number" ||
      !Number.isSafeInteger(child) ||
      !/^person\.\w+$/.test(person)
    ) {
      if (lenient) return [];
      throw new Error(
        typeof child !== "number" || !Number.isSafeInteger(child)
          ? `${name}.child: must be a child id, such as 1001`
          : `${name}.person: must be a person, such as person.ida`,
      );
    }
    return [{ child, person }];
  });
}

/** Reads `sick_threads`: the thread each child's illness is written about in. */
export function parseSickThreads(value: unknown, lenient = false): SickThread[] {
  if (absent(value)) return [];
  if (!Array.isArray(value))
    throw new Error("sick_threads: must be a list of children and threads");
  return (value as unknown[]).flatMap((item, index) => {
    const name = `sick_threads[${String(index)}]`;
    if (!isRecord(item)) throw new Error(`${name}: must be a mapping of child and thread`);
    // The editor's choices are text; YAML has numbers.
    const [child, thread] = [item.child, item.thread].map((id) =>
      typeof id === "string" && id.trim() !== "" ? Number(id) : id,
    );
    const valid = (id: unknown): id is number =>
      typeof id === "number" && Number.isSafeInteger(id) && id > 0;
    if (!valid(child) || !valid(thread)) {
      if (lenient) return [];
      throw new Error(
        valid(child)
          ? `${name}.thread: must be a thread's id, such as 12345`
          : `${name}.child: must be a child id, such as 1001`,
      );
    }
    return [{ child, thread }];
  });
}

/** Reads `look`: rows, columns or board; undefined to follow the children's bar. */
export function parseLook(value: unknown): Look | undefined {
  if (absent(value)) return undefined;
  const look = LOOKS.find((item) => item === value);
  if (look === undefined) throw new Error("look: must be rows, columns or board");
  return look;
}

/** Reads a true or false that is true unless set to false. */
export function parseFlag(value: unknown, name: string): boolean {
  if (absent(value)) return true;
  if (typeof value !== "boolean") throw new Error(`${name}: must be true or false`);
  return value;
}

/** Reads `paths`: the views the overview's tiles go to. */
export function parsePaths(value: unknown): Paths {
  if (absent(value)) return DEFAULT_PATHS;
  if (!isRecord(value))
    throw new Error("paths: must be a mapping of important, weekplan, week and absence");
  const paths: { -readonly [key in keyof Paths]: string | null } = { ...DEFAULT_PATHS };
  for (const [key, path] of Object.entries(value)) {
    if (!(key in DEFAULT_PATHS))
      throw new Error(
        `paths: unknown key "${key}"; the keys are important, weekplan, week and absence`,
      );
    if (absent(path)) continue;
    if (path === false) paths[key as keyof Paths] = null;
    else if (typeof path !== "string")
      throw new Error(`paths.${key}: must be a view's path, or false to leave the tile out`);
    else paths[key as keyof Paths] = path.trim();
  }
  return paths;
}

/** Reads `important`: how the overview shows what is important, `compact` by default. */
export function parseImportant(value: unknown): "compact" | "full" {
  if (absent(value)) return "compact";
  if (value !== "compact" && value !== "full")
    throw new Error("important: must be compact or full");
  return value;
}

/** Reads `pack_icons`: things to bring and their mdi icons. */
export function parsePackIcons(value: unknown): Record<string, string> {
  if (absent(value)) return {};
  if (!isRecord(value)) throw new Error("pack_icons: must be a mapping of things to icons");
  const icons: Record<string, string> = {};
  for (const [thing, icon] of Object.entries(value)) {
    if (typeof icon !== "string" || !/^mdi:[a-z0-9-]+$/.test(icon.trim()))
      throw new Error(`pack_icons.${thing}: must be an icon, such as mdi:tshirt-crew-outline`);
    icons[thing.trim().toLowerCase()] = icon.trim();
  }
  return icons;
}

/** Reads an optional text: undefined when it is absent or blank. */
export function parseText(value: unknown, name: string): string | undefined {
  if (absent(value)) return undefined;
  if (typeof value !== "string") throw new Error(`${name}: must be a text`);
  return value.trim() === "" ? undefined : value.trim();
}

/**
 * Checks the children's bar's configuration and fills in its defaults.
 *
 * @throws Error naming the first invalid key.
 */
export function resolveChildrenConfig(config: unknown, lenient = false): ChildrenBarConfig {
  const raw = configRecord(config);
  return {
    ...resolveCommon(raw, lenient),
    people: parsePeople(raw.people, lenient),
    lookSwitch: parseFlag(raw.look_switch, "look_switch"),
  };
}

/**
 * Checks the overview's configuration and fills in its defaults.
 *
 * @throws Error naming the first invalid key.
 */
export function resolveOverviewConfig(config: unknown, lenient = false): OverviewConfig {
  const raw = configRecord(config);
  return {
    ...resolveActionConfig(raw, lenient),
    look: parseLook(raw.look),
    paths: parsePaths(raw.paths),
    packIcons: parsePackIcons(raw.pack_icons),
    important: parseImportant(raw.important),
  };
}

/**
 * Checks the Important page's configuration and fills in its defaults.
 *
 * @throws Error naming the first invalid key.
 */
export function resolveImportantConfig(config: unknown, lenient = false): CommonConfig {
  return resolveCommon(configRecord(config), lenient);
}

/**
 * Checks the configuration of a card that acts on Aula and fills in its defaults.
 *
 * @throws Error naming the first invalid key.
 */
export function resolveActionConfig(config: unknown, lenient = false): ActionConfig {
  const raw = configRecord(config);
  return {
    ...resolveCommon(raw, lenient),
    sickMessage: parseText(raw.sick_message, "sick_message"),
    sickThreads: parseSickThreads(raw.sick_threads, lenient),
    sickWrite: parseFlag(raw.sick_write, "sick_write"),
    sender: parseText(raw.sender, "sender"),
  };
}

/** One of the family's cards, by its element. */
export type FamilyCard =
  | typeof CHILDREN_CARD
  | typeof OVERVIEW_CARD
  | typeof IMPORTANT_CARD
  | typeof SICK_CARD
  | typeof VACATION_CARD;

const FORMS: Readonly<Record<FamilyCard, readonly FieldName[]>> = {
  [CHILDREN_CARD]: ["children", "people", "look_switch", "size"],
  [OVERVIEW_CARD]: [
    "children",
    "look",
    "important",
    "switch_time",
    "size",
    "sick_write",
    "sick_message",
    "sick_threads",
    "sender",
    "packing_group",
    "subject_names_group",
  ],
  [IMPORTANT_CARD]: ["children", "size", "subject_names_group"],
  [SICK_CARD]: ["children", "sick_write", "sick_message", "sick_threads", "sender", "size"],
  [VACATION_CARD]: ["children", "sender", "size"],
};

const RESOLVE: Readonly<Record<FamilyCard, (config: unknown, lenient: boolean) => unknown>> = {
  [CHILDREN_CARD]: resolveChildrenConfig,
  [OVERVIEW_CARD]: resolveOverviewConfig,
  [IMPORTANT_CARD]: resolveImportantConfig,
  [SICK_CARD]: resolveActionConfig,
  [VACATION_CARD]: resolveActionConfig,
};

/** Returns the form of one of the family's cards, by its element. */
export function familyForm(card: FamilyCard): ConfigForm {
  return configForm(FORMS[card], RESOLVE[card]);
}
