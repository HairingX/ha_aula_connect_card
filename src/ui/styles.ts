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
  h5,
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
  time {
    white-space: nowrap;
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
  /* The text colour: the primary colour is too faint a ring on light themes with a light one. */
  :focus-visible {
    outline: 2px solid var(--aula-text);
    outline-offset: -2px;
  }
  .quiet,
  .empty,
  .not-yet {
    color: var(--aula-text-2);
  }

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

  /* A container query cannot style its container, so the frame is one and the grid within. */
  .kids {
    container: aula-children / inline-size;
  }
  .children {
    display: grid;
    grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr));
    gap: var(--aula-space-6) var(--aula-space-8);
  }
  .child {
    container: aula-child / inline-size;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
    min-width: 0;
  }
  .children > .child + .child {
    border-top: var(--stacked, 1px solid var(--aula-line));
    padding-top: var(--stacked-gap, var(--aula-space-6));
  }
  .children > .child + .child::before {
    content: "";
    display: var(--beside, none);
    position: absolute;
    top: 0;
    bottom: 0;
    inset-inline-start: calc(var(--aula-space-8) / -2);
    border-inline-start: 1px solid var(--aula-line);
  }
  @container aula-children (min-width: 592px) {
    .aula:not(.large) .kids-2 {
      --cols: 2;
      --stacked: 0;
      --stacked-gap: 0;
      --beside: block;
    }
  }
  @container aula-children (min-width: 712px) {
    .aula.large .kids-2,
    .aula:not(.large) .wide-2 {
      --cols: 2;
      --stacked: 0;
      --stacked-gap: 0;
      --beside: block;
    }
  }
  @container aula-children (min-width: 872px) {
    .aula.large .wide-2 {
      --cols: 2;
      --stacked: 0;
      --stacked-gap: 0;
      --beside: block;
    }
  }
  @container aula-children (min-width: 904px) {
    .aula:not(.large) .kids-3 {
      --cols: 3;
      --stacked: 0;
      --stacked-gap: 0;
      --beside: block;
    }
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
  }

  /* Parts of a line; a dot belongs to the part after it and is cut off at a line's start. */
  .segs {
    display: block;
    overflow: hidden;
    min-width: 0;
  }
  .segs-in {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    margin-inline-start: -1em;
  }
  .seg {
    margin-inline-start: 1em;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .seg + .seg::before {
    content: "·";
    content: "·" / "";
    display: inline-block;
    width: 1em;
    margin-inline-start: -1em;
    text-align: center;
  }

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
  }

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

  /* No fill: nothing on a card that only shows may look as if it could be tapped. */
  .facts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-1) var(--aula-space-4);
  }
  .fact,
  .hours {
    display: inline-flex;
    align-items: center;
    gap: var(--aula-space-1);
    font-weight: var(--aula-medium);
    overflow-wrap: anywhere;
  }
  .fact ha-icon,
  .hours ha-icon {
    --mdc-icon-size: calc(16px * var(--aula-scale));
  }
  .hours {
    white-space: nowrap;
  }

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
    --mdc-icon-size: calc(20px * var(--aula-scale));
    transition: transform var(--ha-animation-duration-fast, 150ms) cubic-bezier(0.4, 0, 0.2, 1);
  }
  details[open] > summary .chevron,
  .more[aria-expanded="true"] .chevron {
    transform: rotate(180deg);
  }
  /* A row's text lines up with the headers; its fill reaches into the card's padding. */
  .fold > summary {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    min-height: var(--aula-target);
    padding: 0 var(--aula-space-3);
    margin-inline: calc(-1 * var(--aula-space-3));
    color: var(--aula-text-2);
  }
  .fold > summary .chevron {
    margin-inline-start: auto;
  }
  @container aula (min-width: 600px) {
    .fold > summary .chevron {
      margin-inline-start: 0;
    }
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

/** The day's header, its blocks with a part per child, and the rows above it. */
export const blocks = css`
  .above {
    display: flex;
    flex-direction: column;
    margin-bottom: var(--aula-space-2);
  }
  .bridge {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-2);
    min-height: calc(32px * var(--aula-scale));
    min-width: 0;
    color: var(--aula-text-2);
  }
  .bridge > * {
    padding-top: calc(7px * var(--aula-scale));
  }
  .bridge-label {
    flex: 0 1 auto;
    min-width: 0;
    font-weight: var(--aula-medium);
    overflow-wrap: anywhere;
  }
  .bridge.alone .bridge-label,
  .bridge-text {
    flex: 1;
    min-width: 0;
  }
  .bridge-end {
    flex: none;
    margin-inline-start: auto;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .bridge-more {
    color: var(--aula-text-2);
    padding: var(--aula-space-1) 0;
    padding-inline-start: calc(var(--aula-icon) + var(--aula-space-2));
  }

  .hero {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-3);
    margin-bottom: var(--aula-space-2);
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
    --mdc-icon-size: calc(28px * var(--aula-scale));
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
    overflow-wrap: anywhere;
  }
  .date-line {
    color: var(--aula-text-2);
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
  /* The wall: what the morning asks is read from across a kitchen; the rest is read up close.
     A narrow card keeps the rest's sizes, as the wall's would not fit beside the date. */
  .aula.large .hours {
    flex-basis: 100%;
  }
  @container aula (min-width: 480px) {
    .aula.large .hero .title {
      font-size: calc(var(--ha-font-size-4xl, 32px) * 1.75);
      font-weight: var(--aula-medium);
    }
    .aula.large .tile {
      width: 96px;
      height: 104px;
    }
    .aula.large .tile .number {
      font-size: calc(var(--ha-font-size-2xl, 24px) * 1.5);
    }
    .aula.large .hours {
      font-size: calc(var(--ha-font-size-2xl, 24px) * 1.5);
    }
    .aula.large .hours ha-icon {
      --mdc-icon-size: 0.8em;
    }
  }

  .blocks,
  .day-blocks {
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
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
    --mdc-icon-size: calc(20px * var(--aula-scale));
  }
  /* The same columns in every block, so that a child's parts line up down the card. */
  .cols {
    display: var(--grid, flex);
    flex-direction: column;
    grid-template-columns: repeat(var(--n, 1), minmax(0, 1fr));
    gap: var(--aula-space-4) var(--aula-space-8);
  }
  .cols > * {
    grid-column: var(--col);
    min-width: 0;
  }
  .part {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .part-who {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    font-weight: var(--aula-medium);
  }
  .part-who .avatar {
    width: calc(20px * var(--aula-scale));
    height: calc(20px * var(--aula-scale));
  }
  @container aula-child (min-width: 592px) {
    .aula:not(.large) .n-2 .cols {
      --grid: grid;
      --n: 2;
    }
    .aula:not(.large) .n-2 .part-who {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  }
  @container aula-child (min-width: 712px) {
    .aula.large .n-2 .cols {
      --grid: grid;
      --n: 2;
    }
    .aula.large .n-2 .part-who {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  }
  @container aula-child (min-width: 904px) {
    .aula:not(.large) .n-3 .cols {
      --grid: grid;
      --n: 3;
    }
    .aula:not(.large) .n-3 .part-who {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  }

  /* Never clamped: homework is what the family acts on. */
  .homework {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--aula-line);
    border-radius: var(--aula-radius);
    background: var(--aula-fill-faint);
  }
  .hw {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-1);
    padding: var(--aula-space-3);
    min-width: 0;
  }
  .hw + .hw {
    border-top: 1px solid var(--aula-line);
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

  .pack {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .pack-subjects {
    line-height: var(--aula-paragraph);
  }
  .pack-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pack-what {
    font-weight: var(--aula-medium);
    line-height: var(--aula-paragraph);
    overflow-wrap: anywhere;
  }
  .pack-item + .pack-item::before {
    content: ", ";
  }
  .pack-row.quote .pack-what {
    font-weight: var(--aula-normal);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .pack-source {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .aula.large .pack-row:not(.quote) .pack-what {
    font-size: calc(var(--ha-font-size-xl, 20px) * 1.5);
    line-height: var(--aula-condensed);
  }
  .aula.large .pack-item {
    display: block;
  }
  .aula.large .pack-item + .pack-item::before {
    content: none;
  }

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
  .lesson.past .subject,
  .lesson.cancelled .lesson-time,
  .lesson.cancelled .subject {
    color: var(--aula-text-2);
  }
  .lesson.cancelled .subject {
    text-decoration: line-through;
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
  /* On a wide card the time follows its event rather than sitting far from it. */
  @container aula (min-width: 600px) {
    .item-text {
      flex: 0 1 auto;
    }
    .item-time::before {
      content: "· ";
    }
  }
`;

/** The school day card. */
export const dayStyles = css`
  .strip {
    --mdc-icon-size: 16px;
  }
  .kid {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    align-content: start;
    gap: var(--aula-space-1) var(--aula-space-3);
  }
  .kid-who {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    flex: 1;
    min-width: 0;
  }
  .kid-name {
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
  }
  .kid > .facts,
  .kid > .alert {
    flex-basis: 100%;
  }
  .single .day-blocks {
    display: block;
  }
  .single .day-blocks > .block {
    break-inside: avoid;
    margin-bottom: var(--aula-space-6);
  }
  .single .day-blocks > .block:last-child {
    margin-bottom: 0;
  }
  /* CSS columns keep the DOM's order, which Tab and screen readers follow. */
  @container aula-child (min-width: 600px) {
    .aula:not(.large) .single .day-blocks {
      columns: 2;
      column-gap: var(--aula-space-8);
    }
  }
  @container aula-child (min-width: 720px) {
    .aula.large .single .day-blocks {
      columns: 2;
      column-gap: var(--aula-space-8);
    }
  }
  @container aula-child (min-width: 900px) {
    .aula:not(.large) .single .day-blocks {
      columns: 3;
    }
  }
  @container aula-child (min-width: 1350px) {
    .aula.large .single .day-blocks {
      columns: 3;
    }
  }
`;

/** The homework card. */
export const homeworkStyles = css`
  .homework-card {
    container: aula-child / inline-size;
    gap: var(--aula-space-6);
  }
  .title-who .avatar,
  .strip .avatar {
    width: calc(32px * var(--aula-scale));
    height: calc(32px * var(--aula-scale));
    font-size: var(--aula-font-s);
  }
  .title-who .who-name,
  .strip .who-name {
    font-size: var(--aula-font-2xl);
    font-weight: var(--aula-normal);
    letter-spacing: -0.012em;
  }
  .homework-card > .strip {
    display: none;
  }
  .hw-day {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
    min-width: 0;
  }
  .day-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--aula-space-3);
  }
  .day-title {
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
  }
  .hw-day.focus .day-title {
    font-size: var(--aula-font-xl);
  }
  .day-head ha-icon {
    align-self: center;
  }
  .day-date {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .earlier .day-title {
    color: var(--aula-text-2);
  }
  .earlier-days {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-6);
    padding-top: var(--aula-space-2);
  }
  @container aula-child (min-width: 592px) {
    .aula:not(.large) .n-2 > .strip {
      display: grid;
    }
  }
  @container aula-child (min-width: 712px) {
    .aula.large .n-2 > .strip {
      display: grid;
    }
  }
  @container aula-child (min-width: 904px) {
    .aula:not(.large) .n-3 > .strip {
      display: grid;
    }
  }
`;

/** The week card. */
export const weekStyles = css`
  .weeks {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-6);
  }
  .week-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--aula-space-2);
    margin-bottom: var(--aula-space-2);
    color: var(--aula-text-2);
    font-weight: var(--aula-medium);
  }
  .week-dates {
    font-size: var(--aula-font-s);
    font-weight: var(--aula-normal);
  }
  .not-yet {
    padding-bottom: var(--aula-space-2);
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
  .day-row:not(.focus-day) > summary,
  .holiday-row {
    margin-inline: calc(-1 * var(--aula-space-3));
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
    align-items: center;
    gap: var(--aula-space-2);
    font-variant-numeric: tabular-nums;
  }
  .line-1 .hours {
    font-weight: var(--aula-normal);
  }
  .line-1 .hours ha-icon {
    display: none;
  }
  .relation {
    margin-inline-start: auto;
  }
  .weekend-name,
  .holiday-name {
    font-weight: var(--aula-medium);
  }
  .line-2 {
    display: flex;
    flex-wrap: wrap;
    gap: 2px var(--aula-space-3);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .line-2 .fact {
    font-weight: var(--aula-normal);
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
  .holiday-row.today-row,
  .focus-day.today {
    position: relative;
  }
  .today-row > summary::before,
  .holiday-row.today-row::before,
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
  .focus-day {
    container: aula-open / inline-size;
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
  .open-title {
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
  .focus-day .homework {
    background: var(--aula-surface);
  }
  .weekend-day + .weekend-day {
    margin-top: var(--aula-space-6);
  }
  .weekend-day > .facts + .blocks {
    margin-top: var(--aula-space-4);
  }
  .weekend-title {
    margin-bottom: var(--aula-space-2);
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
  }
  .weekend-item {
    min-width: 0;
  }
  .rows > li:has(> .focus-day) + li,
  .rows > li + li:has(> .focus-day) {
    border-top-color: transparent;
  }
  @container aula-open (min-width: 600px) {
    .focus-day .blocks {
      display: block;
      columns: 2;
      column-gap: var(--aula-space-8);
    }
    .focus-day .blocks > .block {
      break-inside: avoid;
      margin-bottom: var(--aula-space-6);
    }
  }
`;
