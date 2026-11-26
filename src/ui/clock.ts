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
  const hand = (angle: number, length: number, cls: string): TemplateResult => {
    const tip = pointAt(angle, length);
    return svg`<line class=${cls} x1="50" y1="50" x2=${tip.x} y2=${tip.y}></line>`;
  };
  const stop = pointAt(face.from + face.sweep, 44);
  return html`<svg class="ov-clock-face" viewBox="0 0 100 100" aria-hidden="true">
    <circle class="clock-rim" cx="50" cy="50" r="48"></circle>
    <path class="clock-school" d=${arcPath(face.from, face.sweep, 44)}></path>
    <circle class="clock-end" cx=${stop.x} cy=${stop.y} r="4.5"></circle>
    ${HOURS.map((hour) => {
      const at = pointAt(hour * 30, 32);
      return svg`<text class="clock-hour" x=${at.x} y=${at.y}>${hour}</text>`;
    })}
    ${hand(face.hour, 19, "clock-hour-hand")} ${hand(face.minute, 29, "clock-minute-hand")}
    <circle class="clock-pin" cx="50" cy="50" r="3"></circle>
  </svg>`;
}
