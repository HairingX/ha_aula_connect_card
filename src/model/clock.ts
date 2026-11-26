/**
 * A clock face that shows a school day: where the hour hand is while school goes on, and the
 * hands at the time now.
 *
 * @packageDocumentation
 */

/** A school day on a clock face, its angles in degrees clockwise from twelve. */
export interface ClockFace {
  /** Where the hour hand points when school begins. */
  readonly from: number;
  /** How far the hour hand goes until school ends: never a whole turn. */
  readonly sweep: number;
  /** Where the hour hand points now. */
  readonly hour: number;
  /** Where the minute hand points now. */
  readonly minute: number;
}

/** The longest sweep shown, short of a whole turn so that its end stays apart from its start. */
export const MAX_SWEEP = 350;

function hourAngle(minute: number): number {
  return ((minute / 60) % 12) * 30;
}

function minuteOf(clock: string): number {
  return Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
}

/**
 * Returns the clock face of a school day from `begins` to `ends`, each "HH:MM", at `now`, a
 * minute of the day.
 */
export function clockFace(begins: string, ends: string, now: number): ClockFace {
  const [start, end] = [minuteOf(begins), minuteOf(ends)];
  return {
    from: hourAngle(start),
    sweep: Math.min(Math.max(end - start, 0) / 2, MAX_SWEEP),
    hour: hourAngle(now),
    minute: (now % 60) * 6,
  };
}

/** Returns the point at `angle` degrees clockwise from twelve, `radius` from the centre of a 100 by 100 face. */
export function pointAt(angle: number, radius: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return {
    x: Math.round((50 + radius * Math.sin(radians)) * 100) / 100,
    y: Math.round((50 - radius * Math.cos(radians)) * 100) / 100,
  };
}

/** Returns an SVG path along the rim at `radius`, from `from` degrees through `sweep` degrees. */
export function arcPath(from: number, sweep: number, radius: number): string {
  const start = pointAt(from, radius);
  const end = pointAt(from + sweep, radius);
  const large = sweep > 180 ? 1 : 0;
  return `M ${String(start.x)} ${String(start.y)} A ${String(radius)} ${String(radius)} 0 ${String(large)} 1 ${String(end.x)} ${String(end.y)}`;
}
