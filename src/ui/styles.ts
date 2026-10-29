/**
 * The cards' styles, made only from Home Assistant's design tokens, each with a literal fallback.
 * The theme's primary colour fills marks beside words that say the same, and never colours text:
 * no common primary colour is readable as small text on both light and dark cards.
 *
 * @packageDocumentation
 */

import { css } from "lit";

/** The tokens, the card's frame, and what every card shares. */
export const base = css`
  :host {
    display: block;
  }

  ha-card {
    height: 100%;
    box-sizing: border-box;
    overflow-y: auto;
  }

  .aula {
    --aula-scale: 1;
    --aula-text: var(--primary-text-color, #212121);
    --aula-text-2: var(--secondary-text-color, #727272);
    --aula-fill-faint: rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.04);
    --aula-fill-muted: rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.08);
    --aula-fill-strong: rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.15);
    --aula-line: var(--divider-color, rgba(0, 0, 0, 0.12));
    --aula-surface: var(--ha-card-background, var(--card-background-color, #fff));
    --aula-accent: var(--primary-color, #009ac7);
    --aula-warning: var(--warning-color, #ffa600);
    --aula-warning-fill: rgba(var(--rgb-warning-color, 255, 166, 0), 0.15);
    --aula-error: var(--error-color, #db4437);
    --aula-error-fill: rgba(var(--rgb-error-color, 219, 68, 55), 0.12);
    --aula-info: var(--info-color, #039be5);
    --aula-info-fill: rgba(var(--rgb-info-color, 3, 155, 229), 0.12);
    --aula-font-xs: calc(var(--ha-font-size-xs, 10px) * var(--aula-scale));
    --aula-font-s: calc(var(--ha-font-size-s, 12px) * var(--aula-scale));
    --aula-font-m: calc(var(--ha-font-size-m, 14px) * var(--aula-scale));
    --aula-font-l: calc(var(--ha-font-size-l, 16px) * var(--aula-scale));
    --aula-font-xl: calc(var(--ha-font-size-xl, 20px) * var(--aula-scale));
    --aula-font-2xl: calc(var(--ha-font-size-2xl, 24px) * var(--aula-scale));
    --aula-font-3xl: calc(var(--ha-font-size-3xl, 28px) * var(--aula-scale));
    --aula-font-4xl: calc(var(--ha-font-size-4xl, 32px) * var(--aula-scale));
    --aula-space-1: calc(var(--ha-space-1, 4px) * var(--aula-scale));
    --aula-space-2: calc(var(--ha-space-2, 8px) * var(--aula-scale));
    --aula-space-3: calc(var(--ha-space-3, 12px) * var(--aula-scale));
    --aula-space-4: calc(var(--ha-space-4, 16px) * var(--aula-scale));
    --aula-space-5: calc(var(--ha-space-5, 20px) * var(--aula-scale));
    --aula-space-6: calc(var(--ha-space-6, 24px) * var(--aula-scale));
    --aula-space-8: calc(var(--ha-space-8, 32px) * var(--aula-scale));
    --aula-target: calc(48px * var(--aula-scale));
    --aula-normal: var(--ha-font-weight-normal, 400);
    --aula-medium: var(--ha-font-weight-medium, 500);
    --aula-bold: var(--ha-font-weight-bold, 700);
    --aula-condensed: var(--ha-line-height-condensed, 1.2);
    --aula-paragraph: var(--ha-line-height-normal, 1.6);
    --aula-radius: var(--ha-border-radius-md, 8px);
    --aula-radius-lg: var(--ha-border-radius-lg, 12px);
    --aula-icon: calc(18px * var(--aula-scale));
    container: aula / inline-size;
    color: var(--aula-text);
    font-size: var(--aula-font-m);
    line-height: var(--aula-condensed);
  }
  .aula.large {
    --aula-scale: 1.5;
  }

  .body {
    padding: var(--aula-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
  }
  @container aula (max-width: 359px) {
    .body {
      padding: var(--aula-space-3);
    }
  }
  @container aula (min-width: 600px) {
    .body {
      padding: var(--aula-space-5) var(--aula-space-6);
    }
  }

  h2,
  h3,
  h4,
  p {
    margin: 0;
    font: inherit;
  }
  ol,
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  ha-icon {
    --mdc-icon-size: var(--aula-icon);
    flex: none;
    color: var(--aula-text-2);
  }
  time,
  .tabular {
    font-variant-numeric: tabular-nums;
  }
  .period {
    font-size: 0.8em;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  :focus-visible {
    outline: 2px solid var(--primary-color, #009ac7);
    outline-offset: -2px;
  }
  .quiet {
    color: var(--aula-text-2);
  }

  /* Loading, refreshing and errors. */
  .status {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .pulse {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--aula-accent);
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
  .alert {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-2);
    padding: var(--aula-space-2);
    border-radius: var(--ha-border-radius-sm, 4px);
    background: var(--aula-info-fill);
    line-height: var(--aula-paragraph);
  }
  .alert ha-icon {
    --mdc-icon-size: calc(24px * var(--aula-scale));
    color: var(--aula-info);
  }
  .alert.error {
    background: var(--aula-error-fill);
  }
  .alert.error ha-icon {
    color: var(--aula-error);
  }
  .alert.warning {
    background: var(--aula-warning-fill);
  }
  .alert.warning ha-icon {
    color: var(--aula-warning);
  }

  /* Children: side by side when each gets its minimum, else stacked with a line between. */
  /* The frame is the container: a container query cannot style the container itself. */
  .kids {
    container: aula-children / inline-size;
  }
  .children {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--aula-space-6);
  }
  .child {
    container: aula-child / inline-size;
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
    min-width: 0;
  }
  .children > .child + .child {
    border-top: 1px solid var(--aula-line);
    padding-top: var(--aula-space-6);
  }
  .children > .child + .child::before {
    content: "";
    display: none;
    position: absolute;
    top: 0;
    bottom: 0;
    inset-inline-start: calc(var(--aula-space-8) / -2);
    border-inline-start: 1px solid var(--aula-line);
  }
  .child {
    position: relative;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
  }

  /* The who line: the child's initial, name, and what the card is. */
  .who {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    min-width: 0;
  }
  .avatar {
    flex: none;
    display: grid;
    place-items: center;
    width: calc(24px * var(--aula-scale));
    height: calc(24px * var(--aula-scale));
    border-radius: 50%;
    background: var(--aula-fill-strong);
    font-size: var(--aula-font-xs);
    font-weight: var(--aula-bold);
  }
  .who-name {
    font-weight: var(--aula-medium);
  }
  .who-meta {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    overflow-wrap: anywhere;
  }
  .who-end {
    margin-inline-start: auto;
    padding-inline-start: var(--aula-space-2);
    text-align: end;
  }

  /* Labels: Home Assistant's dense ha-label, never focusable. */
  .label {
    display: inline-flex;
    align-items: center;
    gap: var(--aula-space-1);
    min-height: calc(20px * var(--aula-scale));
    padding: 0 var(--aula-space-2);
    border-radius: var(--aula-radius);
    background: var(--aula-fill-strong);
    color: var(--aula-text);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-medium);
    line-height: var(--aula-condensed);
    white-space: nowrap;
    vertical-align: middle;
  }
  .label ha-icon {
    --mdc-icon-size: calc(14px * var(--aula-scale));
  }
  .label.warning {
    background: var(--aula-warning-fill);
    white-space: normal;
  }
  .label.warning ha-icon {
    color: var(--aula-warning);
  }
  .dot {
    flex: none;
    width: calc(8px * var(--aula-scale));
    height: calc(8px * var(--aula-scale));
    border-radius: 50%;
    background: var(--aula-accent);
  }

  /* Chips: a day's all-day events and birthdays, at a glance. */
  .chip {
    display: inline-flex;
    align-items: center;
    gap: calc(6px * var(--aula-scale));
    min-height: calc(28px * var(--aula-scale));
    padding: 0 calc(10px * var(--aula-scale));
    border-radius: var(--aula-radius);
    background: var(--aula-fill-strong);
    font-weight: var(--aula-medium);
    overflow-wrap: anywhere;
  }
  .chip ha-icon {
    --mdc-icon-size: calc(16px * var(--aula-scale));
  }

  /* Disclosures: native details, the whole row the target. */
  details > summary {
    list-style: none;
    cursor: pointer;
    border-radius: var(--aula-radius);
    -webkit-tap-highlight-color: transparent;
  }
  details > summary::-webkit-details-marker {
    display: none;
  }
  .chevron {
    --mdc-icon-size: calc(24px * var(--aula-scale));
    transition: transform var(--ha-animation-duration-fast, 150ms) cubic-bezier(0.4, 0, 0.2, 1);
  }
  details[open] > summary .chevron,
  .more[aria-expanded="true"] .chevron {
    transform: rotate(180deg);
  }
  .fold > summary {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    min-height: var(--aula-target);
    padding: 0 var(--aula-space-3);
    color: var(--aula-text-2);
  }
  .fold > summary .chevron {
    margin-inline-start: auto;
  }
  @media (hover: hover) {
    details > summary:hover,
    .more:hover {
      background: var(--aula-fill-muted);
    }
  }
  details > summary:active,
  .more:active {
    background: var(--aula-fill-strong);
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse {
      animation: none;
    }
    .chevron {
      transition: none;
    }
  }
`;

/** The day's header, its blocks, and the rows above it. */
export const blocks = css`
  /* The rest of today and the days passed over: a four-slot line each, no box, no tap. */
  .above {
    display: flex;
    flex-direction: column;
  }
  .bridge {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    min-height: calc(32px * var(--aula-scale));
    min-width: 0;
  }
  .bridge-label {
    flex: none;
    font-weight: var(--aula-medium);
  }
  .bridge-text {
    flex: 1;
    min-width: 0;
    color: var(--aula-text-2);
    overflow-wrap: anywhere;
  }
  .bridge-end {
    flex: none;
    margin-inline-start: auto;
    color: var(--aula-text-2);
    font-variant-numeric: tabular-nums;
  }
  .bridge-more,
  .none {
    color: var(--aula-text-2);
    padding: var(--aula-space-1) 0;
  }
  .bridge-more {
    padding-inline-start: calc(var(--aula-icon) + var(--aula-space-2));
  }
  .none {
    line-height: var(--aula-paragraph);
  }

  /* The header: which day, the largest text on the card. */
  .hero {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-3);
  }
  .tile {
    position: relative;
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: calc(52px * var(--aula-scale));
    height: calc(56px * var(--aula-scale));
    border-radius: var(--aula-radius-lg);
    background: var(--aula-fill-muted);
    overflow: hidden;
  }
  .tile.today::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: calc(4px * var(--aula-scale));
    background: var(--aula-accent);
  }
  .weekday {
    color: var(--aula-text-2);
    font-size: var(--aula-font-xs);
    font-weight: var(--aula-bold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .tile .number {
    font-size: var(--aula-font-xl);
    font-weight: var(--aula-medium);
    font-variant-numeric: tabular-nums;
  }
  .hero-text {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
    min-width: 0;
    flex: 1;
  }
  .heading {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-1);
  }
  .title {
    display: block;
    font-size: var(--aula-font-2xl);
    font-weight: var(--aula-normal);
    letter-spacing: -0.012em;
  }
  .date-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--aula-space-1);
    color: var(--aula-text-2);
  }
  .date-line ha-icon {
    --mdc-icon-size: calc(14px * var(--aula-scale));
  }
  .next {
    display: inline-flex;
    align-items: center;
    gap: var(--aula-space-1);
    white-space: nowrap;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-2);
  }
  .hours {
    display: inline-flex;
    align-items: center;
    gap: var(--aula-space-1);
    font-weight: var(--aula-medium);
    white-space: nowrap;
  }
  .hours ha-icon {
    --mdc-icon-size: calc(16px * var(--aula-scale));
  }
  @container aula (min-width: 600px) {
    .hero .title {
      font-size: var(--aula-font-3xl);
    }
  }
  @container aula (min-width: 900px) {
    .hero .title {
      font-size: var(--aula-font-4xl);
    }
    .tile {
      width: calc(64px * var(--aula-scale));
      height: calc(68px * var(--aula-scale));
    }
    .tile .number {
      font-size: var(--aula-font-2xl);
    }
  }

  /* Blocks: 24 apart, no dividers. */
  .blocks {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-6);
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
    min-width: 0;
  }
  .block-head {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    min-height: calc(24px * var(--aula-scale));
    font-weight: var(--aula-medium);
  }
  .block-meta {
    margin-inline-start: auto;
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-normal);
    font-variant-numeric: tabular-nums;
  }
  .empty {
    color: var(--aula-text-2);
  }

  /* Homework: the one boxed content, never clamped. */
  .homework {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .hw {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-1);
    padding: var(--aula-space-3);
    border: 1px solid var(--aula-line);
    border-radius: var(--aula-radius);
    background: var(--aula-fill-faint);
    min-width: 0;
  }
  .hw-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-1) var(--aula-space-2);
  }
  .hw-title {
    font-weight: var(--aula-medium);
  }
  .hw-text {
    line-height: var(--aula-paragraph);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  /* Husk: rows, the thing first, where it comes from at the end. */
  .pack {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .pack-row {
    display: flex;
    align-items: baseline;
    gap: var(--aula-space-3);
  }
  .pack-what {
    flex: 1;
    min-width: 0;
    font-weight: var(--aula-medium);
    line-height: var(--aula-paragraph);
    overflow-wrap: anywhere;
  }
  .pack-row.quote .pack-what {
    font-weight: var(--aula-normal);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .pack-source {
    flex: none;
    max-width: 45%;
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    text-align: end;
  }

  /* The timetable: start over end, a rule, the subject and its labels. */
  .lessons {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: var(--aula-space-3);
    row-gap: var(--aula-space-2);
  }
  .lesson,
  .break {
    grid-column: 1 / -1;
    display: grid;
    /* Where subgrid is unknown, each row sizes its own time column. */
    grid-template-columns: max-content minmax(0, 1fr);
    grid-template-columns: subgrid;
    column-gap: var(--aula-space-3);
  }
  .lesson-time {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    white-space: nowrap;
  }
  .lesson-time .start {
    font-weight: var(--aula-medium);
  }
  .lesson-time .end {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .lesson-main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    border-inline-start: 2px solid var(--aula-line);
    padding-inline-start: var(--aula-space-3);
  }
  .lesson.now .lesson-main {
    border-inline-start: 4px solid var(--aula-accent);
    padding-inline-start: calc(var(--aula-space-3) - 2px);
  }
  .lesson-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-1) var(--aula-space-2);
  }
  .subject {
    font-weight: var(--aula-medium);
    overflow-wrap: anywhere;
  }
  .lesson-meta {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    overflow-wrap: anywhere;
  }
  .lesson.past .lesson-time,
  .lesson.past .subject {
    color: var(--aula-text-2);
  }
  .break-main {
    grid-column: 2;
    border-inline-start: 2px dashed var(--aula-line);
    padding-inline-start: var(--aula-space-3);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  abbr {
    text-decoration: none;
  }

  /* The plan: open text with a side rule, in the secondary colour, clamped. */
  .plan {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-3);
  }
  .plan-note {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-inline-start: 2px solid var(--aula-line);
    padding-inline-start: var(--aula-space-3);
    min-width: 0;
  }
  .plan-subject {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-medium);
  }
  .plan-text {
    color: var(--aula-text-2);
    line-height: var(--aula-paragraph);
    white-space: pre-line;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .plan.open .plan-text {
    display: block;
    -webkit-line-clamp: unset;
  }
  .more {
    display: flex;
    align-items: center;
    gap: var(--aula-space-1);
    min-height: var(--aula-target);
    padding: 0 var(--aula-space-3);
    margin: 0 calc(-1 * var(--aula-space-3));
    border: 0;
    border-radius: var(--aula-radius);
    background: none;
    color: var(--aula-text-2);
    font: inherit;
    font-weight: var(--aula-medium);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  /* Events and birthdays: icon rows, the time at the end. */
  .items {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .item {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-2);
  }
  .item-text {
    flex: 1;
    min-width: 0;
    line-height: var(--aula-condensed);
    padding-top: 1px;
    overflow-wrap: anywhere;
  }
  .item-time {
    flex: none;
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    white-space: nowrap;
    padding-top: 2px;
  }
`;

/** The school day card. */
export const dayStyles = css`
  .day-blocks > .block {
    margin-bottom: var(--aula-space-6);
  }
  .day-blocks > .block:last-child {
    margin-bottom: 0;
  }
  .child-row {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .child-row .who-name {
    font-size: var(--aula-font-l);
  }
  .child-row .hours {
    font-weight: var(--aula-medium);
  }
  /* Blocks run in columns, top to bottom, left then right; the order is the DOM's. */
  @container aula-child (min-width: 600px) {
    .aula:not(.large) .day-blocks {
      columns: 2;
      column-gap: var(--aula-space-8);
    }
  }
  @container aula-child (min-width: 900px) {
    .aula:not(.large) .day-blocks {
      columns: 3;
    }
    .aula.large .day-blocks {
      columns: 2;
      column-gap: var(--aula-space-8);
    }
  }
  @container aula-child (min-width: 1350px) {
    .aula.large .day-blocks {
      columns: 3;
    }
  }
  /* A margin at the foot of a column is cut by the break, so the columns' tops align. */
  .day-blocks > .block {
    break-inside: avoid;
  }
  /* Children side by side when each gets 280 px (340 large). */
  @container aula-children (min-width: 592px) {
    .aula:not(.large) .kids-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
    }
    .aula:not(.large) .kids-2 > .child + .child {
      border-top: 0;
      padding-top: 0;
    }
    .aula:not(.large) .kids-2 > .child + .child::before {
      display: block;
    }
  }
  @container aula-children (min-width: 712px) {
    .aula.large .kids-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
    }
    .aula.large .kids-2 > .child + .child {
      border-top: 0;
      padding-top: 0;
    }
    .aula.large .kids-2 > .child + .child::before {
      display: block;
    }
  }
  @container aula-children (min-width: 904px) {
    .aula:not(.large) .kids-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
    }
    .aula:not(.large) .kids-3 > .child + .child {
      border-top: 0;
      padding-top: 0;
    }
    .aula:not(.large) .kids-3 > .child + .child::before {
      display: block;
    }
  }
`;

/** The homework card. */
export const homeworkStyles = css`
  .groups {
    display: flex;
    flex-direction: column;
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
    padding: var(--aula-space-4) 0;
    min-width: 0;
  }
  .group:first-child {
    padding-top: 0;
  }
  .group + .group {
    border-top: 1px solid var(--aula-line);
  }
  .group-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--aula-space-2);
  }
  .group-title {
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
  }
  .group-date {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    text-align: end;
  }
  .earlier .group-title {
    color: var(--aula-text-2);
  }
  .not-yet {
    color: var(--aula-text-2);
    padding: var(--aula-space-2) 0;
  }
  @container aula-child (min-width: 600px) {
    .groups {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
      align-items: start;
    }
    .group:nth-child(2) {
      padding-top: 0;
    }
    .group + .group {
      border-top: 0;
    }
  }
  /* Children side by side when each gets 280 px (340 large). */
  @container aula-children (min-width: 592px) {
    .aula:not(.large) .kids-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
    }
    .aula:not(.large) .kids-2 > .child + .child {
      border-top: 0;
      padding-top: 0;
    }
    .aula:not(.large) .kids-2 > .child + .child::before {
      display: block;
    }
  }
  @container aula-children (min-width: 712px) {
    .aula.large .kids-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
    }
    .aula.large .kids-2 > .child + .child {
      border-top: 0;
      padding-top: 0;
    }
    .aula.large .kids-2 > .child + .child::before {
      display: block;
    }
  }
  @container aula-children (min-width: 904px) {
    .aula:not(.large) .kids-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
    }
    .aula:not(.large) .kids-3 > .child + .child {
      border-top: 0;
      padding-top: 0;
    }
    .aula:not(.large) .kids-3 > .child + .child::before {
      display: block;
    }
  }
`;

/** The week card. */
export const weekStyles = css`
  .weeks {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--aula-space-6);
  }
  .week-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--aula-space-2);
    margin-bottom: var(--aula-space-2);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-bold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .week-dates {
    font-weight: var(--aula-normal);
    text-transform: none;
    letter-spacing: 0;
  }
  .rows > li + li {
    border-top: 1px solid var(--aula-line);
  }
  .day-row > summary {
    display: flex;
    align-items: center;
    gap: var(--aula-space-3);
    min-height: var(--aula-target);
    padding: var(--aula-space-2) var(--aula-space-3);
    box-sizing: border-box;
  }
  .daycol {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: calc(40px * var(--aula-scale));
  }
  .daycol .number {
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
    font-variant-numeric: tabular-nums;
  }
  .daycol ha-icon {
    --mdc-icon-size: calc(24px * var(--aula-scale));
  }
  .row-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .line-1 {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-1) var(--aula-space-2);
    font-variant-numeric: tabular-nums;
  }
  .line-2 {
    display: flex;
    flex-wrap: wrap;
    gap: 2px var(--aula-space-3);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .line-2 > span {
    display: inline-flex;
    align-items: center;
    gap: var(--aula-space-1);
  }
  .line-2 ha-icon {
    --mdc-icon-size: calc(14px * var(--aula-scale));
  }
  .day-row > summary .chevron {
    flex: none;
  }
  .past .line-1,
  .past .number {
    color: var(--aula-text-2);
  }
  .today-row > summary,
  .focus-day.today {
    position: relative;
  }
  .today-row > summary::before,
  .focus-day.today::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: calc(4px * var(--aula-scale));
    border-radius: var(--aula-radius) 0 0 var(--aula-radius);
    background: var(--aula-accent);
  }
  .holiday-row {
    display: flex;
    align-items: center;
    gap: var(--aula-space-3);
    min-height: var(--aula-target);
    padding: var(--aula-space-2) var(--aula-space-3);
  }
  .holiday-name {
    font-weight: var(--aula-medium);
  }
  /* The open day: a quiet container, its homework on the card's own surface. */
  .focus-day {
    margin: var(--aula-space-2) 0;
    border-radius: var(--aula-radius);
    background: var(--aula-fill-faint);
  }
  .focus-day > summary {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-3);
    padding: var(--aula-space-3);
  }
  .focus-day .open-title {
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
  }
  .focus-day .hero-text {
    gap: var(--aula-space-1);
  }
  .focus-day .facts {
    margin-top: var(--aula-space-1);
  }
  .day-body {
    padding: 0 var(--aula-space-3) var(--aula-space-3);
  }
  .day-row:not(.focus-day) > .day-body {
    padding-top: var(--aula-space-2);
  }
  .focus-day .hw {
    background: var(--aula-surface);
  }
  .rows > li:has(> .focus-day) + li,
  .rows > li + li:has(> .focus-day) {
    border-top-color: transparent;
  }
  @container aula-child (min-width: 600px) {
    .weeks.side {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
    }
  }
  /* Children side by side when each gets 340 px (420 large). */
  @container aula-children (min-width: 712px) {
    .aula:not(.large) .kids-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
    }
    .aula:not(.large) .kids-2 > .child + .child {
      border-top: 0;
      padding-top: 0;
    }
    .aula:not(.large) .kids-2 > .child + .child::before {
      display: block;
    }
  }
  @container aula-children (min-width: 872px) {
    .aula.large .kids-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--aula-space-8);
    }
    .aula.large .kids-2 > .child + .child {
      border-top: 0;
      padding-top: 0;
    }
    .aula.large .kids-2 > .child + .child::before {
      display: block;
    }
  }
`;
