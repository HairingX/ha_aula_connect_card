/**
 * A clock face for a child: the school hours as a band on the rim, where the hour hand goes while
 * school goes on, and the hands at the time now.
 *
 * @packageDocumentation
 */

import { html, svg, type TemplateResult } from "lit/html.js";

import type { ViewContext } from "../core/context.ts";
import { arcPath, clockFace, pointAt } from "../model/clock.ts";
import { clockOf } from "../model/overview.ts";

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);

/** Shows the school hours from `start` to `end`, ISO 8601 times, on a clock at the time now. */
export function schoolClock(start: string, end: string, ctx: ViewContext): TemplateResult {
  const face = clockFace(clockOf(start, ctx.zone), clockOf(end, ctx.zone), ctx.minute);
  const line = (angle: number, from: number, to: number, cls: string): TemplateResult => {
    const [inner, outer] = [pointAt(angle, from), pointAt(angle, to)];
    return svg`<line class=${cls} x1=${inner.x} y1=${inner.y} x2=${outer.x} y2=${outer.y}></line>`;
  };
  const stop = face.from + face.sweep;
  // The band ends square, and a mark across it at each end reaches in toward the hours, so that
  // a quarter before or after an hour reads as such.
  return html`<svg class="ov-clock-face" viewBox="0 0 100 100" aria-hidden="true">
    <circle class="clock-rim" cx="50" cy="50" r="48"></circle>
    ${HOURS.map((hour) => line(hour * 30, 45, 48, "clock-tick"))}
    <path class="clock-school" d=${arcPath(face.from, face.sweep, 44)}></path>
    ${line(face.from, 37, 48, "clock-mark")} ${line(stop, 37, 48, "clock-mark")}
    ${HOURS.map((hour) => {
      const at = pointAt(hour * 30, 30);
      return svg`<text class="clock-hour" x=${at.x} y=${at.y}>${hour}</text>`;
    })}
    ${line(face.hour, 0, 18, "clock-hour-hand")} ${line(face.minute, 0, 28, "clock-minute-hand")}
    <circle class="clock-pin" cx="50" cy="50" r="3"></circle>
  </svg>`;
}
