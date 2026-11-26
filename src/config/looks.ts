/**
 * How each of the overview's looks shows what is important, and the board the school hours.
 *
 * @packageDocumentation
 */

/** How one of the overview's looks shows what is important. */
export interface LookSettings {
  /** The next notes listed, or only a summary of them; either opens them all. */
  readonly important: "list" | "button";
  /** The notes listed at most. */
  readonly max: number;
}

/** How the board shows what is important, and the school hours. */
export interface BoardSettings extends LookSettings {
  /** The school hours as times only, or on a clock too. */
  readonly clock: "digital" | "analog";
}

/** The overview's looks as set where nothing is said of them. */
export const LOOK_DEFAULTS = {
  rows: { important: "list", max: 3 },
  columns: { important: "list", max: 3 },
  board: { important: "list", max: 3, clock: "digital" },
} as const satisfies { rows: LookSettings; columns: LookSettings; board: BoardSettings };

/** The most notes a look can be set to list. */
export const MAX_NOTES = 99;
