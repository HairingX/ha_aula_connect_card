/**
 * How each of the overview's looks shows what is important, and the board the school hours.
 *
 * @packageDocumentation
 */

/** How one of the overview's looks shows what is important. */
export interface LookSettings {
  /** A line that opens it, or the first day's notes shown. */
  readonly important: "compact" | "full";
  /** The notes shown before "Vis mere". */
  readonly max: number;
}

/** How the board shows what is important, and the school hours. */
export interface BoardSettings extends LookSettings {
  /** The school hours as times only, or on a clock too. */
  readonly clock: "digital" | "analog";
}

/** The overview's looks as set where nothing is said of them. */
export const LOOK_DEFAULTS = {
  rows: { important: "compact", max: 3 },
  columns: { important: "compact", max: 3 },
  board: { important: "full", max: 3, clock: "digital" },
} as const satisfies { rows: LookSettings; columns: LookSettings; board: BoardSettings };

/** The notes a look shows at most before "Vis mere". */
export const MAX_NOTES = 20;
