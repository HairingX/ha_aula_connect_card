/**
 * The cards' styles, made only from Home Assistant's design tokens, each with a literal fallback.
 * The theme's primary colour fills marks beside words that say the same, and never colours text:
 * no common primary colour is readable as small text on both light and dark cards.
 *
 * @packageDocumentation
 */

// Each sheet is one template without expressions, so that the build can minify it.
const css = (strings: TemplateStringsArray): string => strings.join("");

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
    --aula-font-xs: calc(var(--ha-font-size-xs, 10px) * var(--aula-scale));
    --aula-font-s: calc(var(--ha-font-size-s, 12px) * var(--aula-scale));
    --aula-font-m: calc(var(--ha-font-size-m, 14px) * var(--aula-scale));
    --aula-font-l: calc(var(--ha-font-size-l, 16px) * var(--aula-scale));
    --aula-font-xl: calc(var(--ha-font-size-xl, 20px) * var(--aula-scale));
    --aula-font-2xl: calc(var(--ha-font-size-2xl, 24px) * var(--aula-scale));
    --aula-space-1: calc(var(--ha-space-1, 4px) * var(--aula-scale));
    --aula-space-2: calc(var(--ha-space-2, 8px) * var(--aula-scale));
    --aula-space-3: calc(var(--ha-space-3, 12px) * var(--aula-scale));
    --aula-space-4: calc(var(--ha-space-4, 16px) * var(--aula-scale));
    --aula-space-6: calc(var(--ha-space-6, 24px) * var(--aula-scale));
    --aula-space-8: calc(var(--ha-space-8, 32px) * var(--aula-scale));
    --aula-target: calc(48px * var(--aula-scale));
    --aula-normal: var(--ha-font-weight-normal, 400);
    --aula-medium: var(--ha-font-weight-medium, 500);
    --aula-bold: var(--ha-font-weight-bold, 700);
    --aula-condensed: var(--ha-line-height-condensed, 1.2);
    --aula-paragraph: var(--ha-line-height-normal, 1.6);
    --aula-radius: var(--ha-border-radius-md, 8px);
    --aula-icon: calc(18px * var(--aula-scale));
    container: aula / inline-size;
    color: var(--aula-text);
    font-size: var(--aula-font-m);
    line-height: var(--aula-condensed);
  }
  .large {
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
  time,
  .span {
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
  /* A week plan not yet in Aula: what is important in it is unknown, said as plainly as nothing important. */
  .empty.missing {
    display: flex;
    gap: var(--aula-space-2);
    color: var(--aula-text);
    font-weight: var(--aula-medium);
  }
  .missing ha-icon {
    color: var(--aula-warning);
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
    background: rgba(var(--rgb-info-color, 3, 155, 229), 0.12);
    line-height: var(--aula-paragraph);
  }
  .alert ha-icon {
    --mdc-icon-size: calc(24px * var(--aula-scale));
    color: var(--info-color, #039be5);
  }
  .alert.error {
    background: rgba(var(--rgb-error-color, 219, 68, 55), 0.12);
  }
  .alert.error ha-icon {
    color: var(--error-color, #db4437);
  }
  .alert.warning {
    background: var(--aula-warning-fill);
  }
  .alert.warning ha-icon {
    color: var(--aula-warning);
  }

  /* A container query cannot style its container, so the frame is one and the grid within. */
  .kids {
    container: kids / inline-size;
  }
  .children {
    display: grid;
    gap: var(--aula-space-6) var(--aula-space-8);
  }
  .child {
    container: child / inline-size;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
    min-width: 0;
  }
  .children > .child + .child {
    border-top: 1px solid var(--aula-line);
    padding-top: var(--aula-space-6);
  }
  /*
   * Children apart each have a column of their own, alike, as many side by side as there is
   * room for and the rest below in the same columns.
   */
  .several {
    --aula-column: 280px;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--aula-column)), 1fr));
  }
  .large .several {
    --aula-column: 332px;
  }
  .children.several > .child {
    padding-top: var(--aula-space-4);
    border-top: 1px solid var(--aula-line);
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
  .label.warning,
  .label.subject {
    white-space: normal;
    overflow-wrap: anywhere;
  }
  /* A note's subject in its colour, as on the day's bar; the theme's own where it has none. */
  .label.subject {
    background: var(--subject, var(--aula-fill-muted));
    color: lch(from var(--subject) calc((49.4 - l) * 1e9) 0 0);
    font-weight: var(--aula-bold);
  }
  .label.warning {
    background: var(--aula-warning-fill);
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

  /* No fill: nothing on a card that only shows may look as if it could be tapped. A line each,
     so that several events never run together; a fact that wraps keeps its icon by its first
     line. */
  .facts {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--aula-space-1);
  }
  /* Its target reaches past its line, which keeps the height of the lines around it. */
  .facts .more {
    margin-block: calc(-1 * var(--aula-space-3));
  }
  .fact,
  .hours {
    display: inline-flex;
    align-items: flex-start;
    gap: var(--aula-space-1);
    font-weight: var(--aula-medium);
    overflow-wrap: anywhere;
  }
  .fact .seg + .seg {
    color: var(--aula-text-2);
  }
  .fact ha-icon,
  .hours ha-icon {
    --mdc-icon-size: calc(16px * var(--aula-scale));
  }
  .hours {
    align-items: center;
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
    flex-wrap: wrap;
    align-items: flex-start;
    column-gap: var(--aula-space-2);
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
    overflow-wrap: break-word;
  }
  .bridge-text {
    flex: 1;
    min-width: 0;
  }
  /* A name too long to share its line with its dates leaves them the next line. */
  .bridge.alone .bridge-label {
    flex: 1 1 8em;
  }
  .bridge-end {
    margin-inline-start: auto;
    font-variant-numeric: tabular-nums;
  }
  @container aula (min-width: 600px) {
    .bridge-text,
    .bridge.alone .bridge-label {
      flex: 0 1 auto;
    }
    .bridge-end {
      margin-inline-start: 0;
    }
    .bridge-end::before {
      content: "· ";
      content: "· " / "";
    }
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
    border-radius: var(--ha-border-radius-lg, 12px);
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
      font-size: calc(var(--ha-font-size-3xl, 28px) * var(--aula-scale));
    }
  }
  @container aula (min-width: 900px) {
    .hero .title {
      font-size: calc(var(--ha-font-size-4xl, 32px) * var(--aula-scale));
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
  .large .hours {
    flex-basis: 100%;
  }
  @container aula (min-width: 480px) {
    .large .hero .title {
      font-size: calc(var(--ha-font-size-4xl, 32px) * 1.75);
      font-weight: var(--aula-medium);
    }
    .large .tile {
      width: 96px;
      height: 104px;
    }
    .large .tile .number {
      font-size: calc(var(--ha-font-size-2xl, 24px) * 1.5);
    }
    .large .hours,
    .large .hours .span {
      font-size: calc(var(--ha-font-size-2xl, 24px) * 1.5);
      white-space: normal;
    }
    .large .hours ha-icon {
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
    display: var(--aula-grid, flex);
    flex-direction: column;
    grid-template-columns: repeat(var(--aula-n, 1), minmax(0, 1fr));
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
  /* Every part names its child, so that whose it is never rests on a column's place. */
  .part-who {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    font-weight: var(--aula-medium);
  }
  /* A child with nothing says so on one line, after its name. */
  .part.is-empty {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    /* Stretched to its row beside a longer part, its sentence still follows the name. */
    align-content: flex-start;
    column-gap: var(--aula-space-2);
  }
  .part-who .avatar {
    width: calc(20px * var(--aula-scale));
    height: calc(20px * var(--aula-scale));
  }
  @container child (min-width: 592px) {
    .normal .n-2 .cols {
      --aula-grid: grid;
      --aula-n: 2;
    }
    .normal .n-2:not(.tworow) .part-who {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
  @container child (min-width: 712px) {
    .large .n-2 .cols {
      --aula-grid: grid;
      --aula-n: 2;
    }
    .large .n-2:not(.tworow) .part-who {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
  @container child (min-width: 904px) {
    .normal .n-3 .cols {
      --aula-grid: grid;
      --aula-n: 3;
    }
    .normal .n-3:not(.tworow) .part-who {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
  @container child (min-width: 1100px) {
    .large .n-3 .cols {
      --aula-grid: grid;
      --aula-n: 3;
    }
    .large .n-3:not(.tworow) .part-who {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
  /* Children in two rows fill them in order. */
  .tworow .cols > * {
    grid-column: auto;
  }
  /* Grouped by child, each child's column flows on its own: a short one leaves no gap. */
  .by-child {
    align-items: start;
    row-gap: var(--aula-space-8);
  }
  .kid-col {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
    min-width: 0;
  }
  /* A child's own parts fill its column; the card's columns are the children's. */
  .by-child > .kid-col .cols {
    --aula-n: 1;
  }

  /* Never clamped: what is important is what the family acts on. */
  .important {
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
  .note-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-1) var(--aula-space-2);
  }
  .note-title {
    font-weight: var(--aula-medium);
  }
  .note-text {
    line-height: var(--aula-paragraph);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  /* Husk heads Vigtigt: each thing in its subject's colour, as its part of the day's bar. */
  .note-pack {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-2);
    overflow-wrap: anywhere;
  }
  .pack-label {
    color: var(--aula-text-2);
  }
  .pack-row {
    display: contents;
  }
  .label.pack-item {
    background: var(--subject, var(--aula-fill-strong));
    color: lch(from var(--subject) calc((49.4 - l) * 1e9) 0 0);
  }
  /* On the wall what to bring is read from across the kitchen. */
  .large .label.pack-item {
    font-size: var(--aula-font-m);
  }
  /* Vigtigt's box is named by a flag in its corner, not a heading over it. */
  .vital {
    position: relative;
  }
  .vital-flag {
    position: absolute;
    top: var(--aula-space-3);
    inset-inline-end: var(--aula-space-3);
    color: var(--aula-text-2);
    --mdc-icon-size: calc(16px * var(--aula-scale));
  }
  .vital .hw:first-child {
    padding-inline-end: calc(var(--aula-space-3) * 2 + 16px * var(--aula-scale));
  }
  /*
   * After the timetable, Vigtigt has no box: Husk follows the bar it comes from, with a line
   * below it, and what the plan marks follows in rows beside one flag.
   */
  [data-block="timetable"] + [data-block="task"] .vital {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--aula-space-3);
  }
  [data-block="timetable"] + [data-block="task"] .important {
    display: contents;
  }
  [data-block="timetable"] + [data-block="task"] .vital-flag {
    position: static;
  }
  [data-block="timetable"] + [data-block="task"] .hw {
    grid-column: 2;
    padding: 0;
    border: 0;
  }
  [data-block="timetable"] + [data-block="task"] .note-pack {
    order: -1;
    grid-column: 1 / -1;
    padding-bottom: var(--aula-space-3);
    border-bottom: 1px solid var(--aula-line);
  }
  [data-block="comment"] .block-head {
    min-height: 0;
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    --mdc-icon-size: calc(16px * var(--aula-scale));
  }
  .pack-source {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-normal);
  }
  .pack-subjects {
    flex-basis: 100%;
    font-weight: var(--aula-normal);
    line-height: var(--aula-paragraph);
  }

  .lessons {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: var(--aula-space-3);
    row-gap: var(--aula-space-2);
  }
  .lesson {
    position: relative;
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
  /* The compact timetable: the day's lanes in the subjects' colours over the hours. */
  .bar-lanes {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .lane {
    position: relative;
    height: calc(28px * var(--aula-scale));
  }
  .lane.thin {
    height: calc(18px * var(--aula-scale));
  }
  button.bar-item {
    margin: 0;
    border: 0;
    font: inherit;
    text-align: start;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  @media (hover: hover) {
    button.bar-item:hover {
      filter: brightness(1.08);
    }
  }
  .bar-item {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 2px;
    box-sizing: border-box;
    padding: 0 var(--aula-space-1);
    overflow: hidden;
    white-space: nowrap;
    border-radius: calc(6px * var(--aula-scale));
    background: var(--subject, var(--aula-fill-strong));
    /* Black or white, whichever reads better on the subject (alike at lightness 49.4). */
    color: lch(from var(--subject) calc((49.4 - l) * 1e9) 0 0);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-medium);
    --mdc-icon-size: 1em;
  }
  .bar-item ha-icon {
    color: inherit;
  }
  /* Its name where it has room, else its abbreviation, else its colour alone. */
  .bar-short,
  .bar-item[data-fit="short"] > .bar-name,
  .bar-item[data-fit="none"] > span {
    display: none;
  }
  .bar-item[data-fit="short"] > .bar-short {
    display: inline;
  }
  .bar-item.cancelled {
    background: none;
    box-shadow: inset 0 0 0 2px var(--subject, var(--aula-fill-strong));
    color: var(--aula-text-2);
    text-decoration: line-through;
  }
  .bar-item.ev {
    background: none;
    box-shadow: inset 0 0 0 1px var(--aula-text-2);
    color: var(--aula-text);
    font-weight: var(--aula-normal);
  }
  .bar-item.all-day {
    background: repeating-linear-gradient(
      135deg,
      var(--aula-fill-strong) 0 6px,
      var(--aula-fill-muted) 6px 12px
    );
    box-shadow: none;
  }
  .hour {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--aula-line);
  }
  .now-mark {
    position: absolute;
    z-index: 1;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-inline-start: -1px;
    border-radius: 1px;
    background: var(--aula-text);
  }
  /* Each time where it falls; those that would touch another are hidden by the card. */
  .ticks {
    position: relative;
    height: calc(var(--aula-font-s) * var(--aula-condensed));
    margin-top: var(--aula-space-1);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    line-height: var(--aula-condensed);
    white-space: nowrap;
  }
  .ticks time {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
  }
  .ticks .first {
    transform: none;
  }
  .ticks .last {
    transform: translateX(-100%);
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
    border-inline-start: 3px solid var(--subject, var(--aula-line));
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
  }
  .plan-text.clamp {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--lines);
    overflow: hidden;
  }
  .more {
    display: flex;
    align-items: center;
    gap: var(--aula-space-1);
    min-height: var(--aula-target);
    padding: 0 var(--aula-space-3);
    /* The target stays 48 px; the space below its words is no wider than between blocks. */
    margin: 0 calc(-1 * var(--aula-space-3)) calc(-1 * var(--aula-space-3));
    border: 0;
    border-radius: var(--aula-radius);
    background: none;
    color: var(--aula-text-2);
    font: inherit;
    font-weight: var(--aula-medium);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  /*
   * The timetable folds at a tap anywhere on it, so its button is only a small mark at its end,
   * unlike the chevrons that open rows, its words left to a screen reader.
   */
  [data-block="timetable"]:has(> .cols + .more) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    column-gap: var(--aula-space-2);
  }
  .unfolds {
    cursor: pointer;
  }
  .cols + .more {
    justify-content: center;
    width: calc(24px * var(--aula-scale));
    min-height: calc(24px * var(--aula-scale));
    margin: 0;
    padding: 0;
  }

  /* An event in the timetable: its icon before its title, its time where a lesson's is. */
  .event-row .lesson-head {
    display: flex;
    flex-wrap: nowrap;
    align-items: baseline;
    gap: var(--aula-space-2);
    --mdc-icon-size: calc(18px * var(--aula-scale));
  }
  .event-row ha-icon {
    flex: none;
    align-self: center;
  }
  .event-text {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .event-place {
    display: block;
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }

  /*
   * A lesson or an event opens its window at a tap anywhere on its row: its button's target is
   * the row, reaching a little past it, and its state shows there.
   */
  .opens {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .opens::after {
    content: "";
    position: absolute;
    inset: calc(-1 * var(--aula-space-1)) calc(-1 * var(--aula-space-2));
    border-radius: var(--aula-radius);
  }
  .opens:focus-visible {
    outline: none;
  }
  .opens:focus-visible::after {
    outline: 2px solid var(--aula-text);
  }
  @media (hover: hover) {
    .opens:hover::after {
      background: var(--aula-fill-muted);
    }
  }
  .opens:active::after {
    background: var(--aula-fill-strong);
  }
`;

/**
 * The window of a lesson or an event, in Home Assistant's dialogs' look: above the page, its
 * width a phone's or, on the wall, a third more, scrolled within where it is longer than the
 * screen.
 */
export const details = css`
  .detail {
    box-sizing: border-box;
    width: min(calc(100vw - 2 * var(--aula-space-4)), calc(480px * var(--aula-scale)));
    max-width: none;
    max-height: calc(100dvh - 2 * var(--aula-space-4));
    margin: auto;
    padding: 0;
    border: 0;
    border-radius: var(--ha-dialog-border-radius, var(--ha-border-radius-3xl, 24px));
    background: var(
      --ha-dialog-surface-background,
      var(--mdc-theme-surface, var(--card-background-color, #fff))
    );
    box-shadow: var(--ha-box-shadow-l, 0 16px 32px -6px rgba(0, 0, 0, 0.2));
    color: var(--aula-text);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  /* On a phone the window is a sheet from the bottom, in reach of the thumb. */
  @media (max-width: 600px) {
    .detail {
      width: 100vw;
      max-height: calc(100dvh - var(--aula-space-8));
      margin: auto 0 0;
      border-radius: var(--ha-dialog-border-radius, var(--ha-border-radius-3xl, 24px))
        var(--ha-dialog-border-radius, var(--ha-border-radius-3xl, 24px)) 0 0;
    }
  }
  .detail::backdrop {
    background: var(--mdc-dialog-scrim-color, rgba(0, 0, 0, 0.32));
  }
  .detail-body {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
    padding: var(--aula-space-4) var(--aula-space-6) var(--aula-space-6);
  }
  @media (max-width: 400px) {
    .detail-body {
      padding-inline: var(--aula-space-4);
    }
  }
  .detail-cols,
  .detail-col {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
  }
  /* On the wall an event's window is wider, its people and answer in a column of their own, so
     that it is read without scrolling. */
  @media (min-width: 1000px) {
    .large .detail:has(.detail-col + .detail-col) {
      width: min(calc(100vw - 2 * var(--aula-space-4)), 1120px);
    }
    .large .detail-cols:has(.detail-col + .detail-col) {
      display: grid;
      grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
      align-items: start;
      gap: var(--aula-space-8);
    }
    .large .detail-col + .detail-col > .detail-section:first-child {
      padding-top: 0;
      border-top: 0;
    }
  }
  .detail-head {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-3);
  }
  .detail-titles {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding-top: var(--aula-space-2);
  }
  .detail-title {
    display: flex;
    align-items: baseline;
    gap: var(--aula-space-2);
    font-size: var(--aula-font-xl);
    font-weight: var(--aula-medium);
    overflow-wrap: anywhere;
  }
  /* A lesson's subject has its colour, as in the timetable; nothing else in the window has one. */
  .detail-dot {
    flex: none;
    width: calc(12px * var(--aula-scale));
    height: calc(12px * var(--aula-scale));
    border-radius: 50%;
    background: var(--subject);
  }
  .detail-meta,
  .detail-quiet,
  .detail-under,
  .detail-whole,
  .detail-row dt {
    color: var(--aula-text-2);
  }
  .detail-meta,
  .detail-quiet {
    font-size: var(--aula-font-s);
  }
  /* Its target is 48 px; its mark lines up with the window's edge and the title's first line. */
  .detail-close {
    flex: none;
    display: grid;
    place-items: center;
    width: var(--aula-target);
    height: var(--aula-target);
    margin-inline-end: calc(-1 * var(--aula-space-3));
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    --mdc-icon-size: calc(24px * var(--aula-scale));
  }
  .detail-close ha-icon {
    color: var(--aula-text);
  }
  @media (hover: hover) {
    .detail-close:hover {
      background: var(--aula-fill-muted);
    }
  }
  .detail-close:active {
    background: var(--aula-fill-strong);
  }
  .detail-labels {
    display: flex;
    flex-wrap: wrap;
    gap: var(--aula-space-2);
  }
  /*
   * The time is what the window is opened for: a ticket on a plain surface, the day's tile beside
   * a dashed line, the time the largest text. Colours mean subjects on the card, so it has none.
   */
  .detail-ticket {
    display: flex;
    align-items: center;
    gap: var(--aula-space-4);
    padding: var(--aula-space-3) var(--aula-space-4) var(--aula-space-3) var(--aula-space-3);
    border: 1px solid var(--aula-line);
    border-radius: calc(var(--aula-radius) * 1.5);
    background: var(--aula-fill-faint);
  }
  .detail-ticket .tile {
    background: var(--aula-fill-strong);
  }
  .detail-stub {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding-inline-start: var(--aula-space-4);
    border-inline-start: 2px dashed var(--aula-line);
  }
  .detail-what,
  .detail-heading {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-bold);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .detail-when {
    font-size: var(--aula-font-2xl);
    font-weight: var(--aula-bold);
    overflow-wrap: anywhere;
  }
  .detail-whole {
    display: flex;
    flex-wrap: wrap;
    column-gap: var(--aula-space-2);
    margin-top: calc(-1 * var(--aula-space-2));
    padding-inline: var(--aula-space-3);
    font-size: var(--aula-font-s);
  }
  .detail-whole-label {
    font-weight: var(--aula-medium);
  }
  /* The rest in sections under quiet headings, each a list of what it is beside what it says. */
  .detail-section {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
    padding-top: var(--aula-space-4);
    border-top: 1px solid var(--aula-line);
  }
  .detail-list {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: var(--aula-space-2) var(--aula-space-4);
    margin: 0;
  }
  .detail-row {
    display: contents;
  }
  .detail-row dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .detail-line {
    display: block;
  }
  .detail-moment {
    white-space: nowrap;
  }
  .label.detail-answer {
    background: var(--aula-fill-muted);
    font-size: var(--aula-font-m);
  }
  .detail-row .label.warning {
    margin-inline-start: var(--aula-space-1);
  }
  .detail-row dd > .label.warning:first-child {
    margin-inline-start: 0;
  }
  .detail-text {
    margin-top: var(--aula-space-1);
    line-height: var(--aula-paragraph);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
  /* A wait is shown in the text's colours too. */
  .detail .pulse {
    background: var(--aula-text-2);
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
  @container child (min-width: 600px) {
    .normal :not(.several) > .single .day-blocks {
      columns: 2;
      column-gap: var(--aula-space-8);
    }
  }
  @container child (min-width: 720px) {
    .large :not(.several) > .single .day-blocks {
      columns: 2;
      column-gap: var(--aula-space-8);
    }
  }
  @container child (min-width: 900px) {
    .normal :not(.several) > .single .day-blocks {
      columns: 3;
    }
  }
  @container child (min-width: 1350px) {
    .large :not(.several) > .single .day-blocks {
      columns: 3;
    }
  }
`;

/** The week plan card. */
export const weekplanStyles = css`
  .weekplan-card {
    container: child / inline-size;
    gap: var(--aula-space-6);
  }
  /* What the week plan marks stands on a surface; its other notes follow quietly below. */
  .part > .important + .plan {
    margin-top: var(--aula-space-4);
  }
  .strip .who-name {
    font-size: var(--aula-font-l);
  }
  .weekplan-card > .strip {
    display: none;
  }
  .note-days {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-6);
  }
  .note-day {
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
  .note-day.focus .day-title {
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
    padding-top: var(--aula-space-2);
  }
  /* One child's days stand side by side in calendar order where there is room. */
  @container child (min-width: 600px) {
    .normal .n-1 .note-days {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--aula-space-6) var(--aula-space-8);
      align-items: start;
    }
    .weekplan-card > .fold > summary .chevron {
      margin-inline-start: 0;
    }
  }
  @container child (min-width: 720px) {
    .large .n-1 .note-days {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: var(--aula-space-6) var(--aula-space-8);
      align-items: start;
    }
  }
  @container child (min-width: 592px) {
    .normal .n-2 > .strip {
      display: grid;
    }
  }
  @container child (min-width: 712px) {
    .large .n-2 > .strip {
      display: grid;
    }
  }
  @container child (min-width: 904px) {
    .normal .n-3 > .strip {
      display: grid;
    }
  }
  @container child (min-width: 1100px) {
    .large .n-3 > .strip {
      display: grid;
    }
  }
  .weekplan-card.tworow > .strip {
    display: none;
  }
`;

/** The week card. */
export const weekStyles = css`
  /* The steps sit at the end, in reach of a thumb; "I dag" at the start, only while away. */
  .week-nav {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: var(--aula-space-1);
    margin: calc(-1 * var(--aula-space-2)) calc(-1 * var(--aula-space-2)) var(--aula-space-2);
  }
  /* Beside the steps, the week's name and dates wrap rather than push them away. */
  .week-top {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
  }
  .week-top > .week-head {
    flex: 1;
    flex-wrap: wrap;
  }
  .week-top > .week-nav {
    margin: calc(-1 * var(--aula-space-3)) calc(-1 * var(--aula-space-2)) 0 0;
  }
  .nav-step,
  .nav-today {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--aula-target);
    border: 0;
    border-radius: var(--aula-target);
    background: none;
    color: var(--aula-text-2);
    font: inherit;
    font-weight: var(--aula-medium);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .nav-step {
    width: var(--aula-target);
  }
  /* The target stays 48 px; the pill in it is no taller than a line of text. */
  .nav-today {
    margin-inline-end: auto;
    color: var(--aula-text);
  }
  .nav-today > span {
    padding: var(--aula-space-1) var(--aula-space-3);
    border-radius: var(--aula-target);
    background: var(--aula-fill-muted);
  }
  @media (hover: hover) {
    .nav-step:hover,
    .nav-today:hover > span {
      background: var(--aula-fill-strong);
    }
  }
  .nav-step:active,
  .nav-today:active > span {
    background: var(--aula-fill-strong);
  }
  .count {
    white-space: nowrap;
    --mdc-icon-size: 1.1em;
  }
  .count ha-icon {
    vertical-align: -0.2em;
    margin-inline-end: 2px;
  }
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
  /* A row's fill, and an open day's frame, reach into the card's padding by as much. */
  .week {
    --aula-bleed: var(--aula-space-3);
  }
  @container aula (max-width: 359px) {
    .week {
      --aula-bleed: var(--aula-space-2);
    }
  }
  .day-row:not(.focus-day) > summary {
    margin-inline: calc(-1 * var(--aula-bleed));
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
  /* Today's bar is on the edge a row's fill and an open day's frame share, closed or open. */
  .today-row,
  .focus-day.today {
    position: relative;
  }
  .focus-day.today::before {
    inset-inline-start: 0;
  }
  .today-row::before {
    inset-inline-start: calc(-1 * var(--aula-bleed));
  }
  .today-row::before,
  .focus-day.today::before {
    content: "";
    position: absolute;
    inset-block: 0;
    width: calc(4px * var(--aula-scale));
    border-radius: var(--aula-radius) 0 0 var(--aula-radius);
    background: var(--aula-accent);
  }
  .holiday-row {
    display: flex;
    align-items: center;
    gap: var(--aula-space-3);
    min-height: var(--aula-target);
    /* No fill to reach out, so its date steps in to the others'. */
    padding: var(--aula-space-2) calc(var(--aula-space-3) - var(--aula-bleed));
  }
  /*
   * An open day is framed, the focus day and any other the user opens alike. The frame reaches
   * out as far as a closed row's fill, so that its date stays in the column of the others.
   */
  .focus-day,
  .day-row[open] {
    container: day / inline-size;
    margin: var(--aula-space-2) calc(-1 * var(--aula-bleed));
    border-radius: var(--aula-radius);
    background: var(--aula-fill-faint);
  }
  .day-row[open] > summary {
    margin-inline: 0;
  }
  .focus-day > summary {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-3);
    padding: var(--aula-space-3);
  }
  /* A step above the day's block headers, as the week plan card's focus day. */
  .open-title,
  .weekend-title {
    font-size: var(--aula-font-xl);
    font-weight: var(--aula-medium);
  }
  /* The focus day's title is a line with how far ahead it is, a step below the week's weight. */
  .focus-day .heading {
    flex-direction: row;
    align-items: baseline;
  }
  .open-title {
    flex: 1;
    font-size: var(--aula-font-l);
  }
  /* An open day's timetable stands first, between lines. */
  .day-body [data-block="timetable"] {
    padding-block: var(--aula-space-3);
    border-block: 1px solid var(--aula-line);
  }
  .focus-day .hero-text {
    gap: var(--aula-space-1);
  }
  .day-body {
    padding: 0 var(--aula-space-3) var(--aula-space-3);
  }
  .day-row:not(.focus-day) > .day-body {
    padding-top: var(--aula-space-2);
  }
  /* An open day's Husk sits close under its bar, the timetable's line moving below it. */
  .day-body [data-block="timetable"]:has(+ [data-block="task"] .note-pack) {
    padding-bottom: 0;
    border-bottom: 0;
  }
  .day-body [data-block="timetable"] + [data-block="task"]:has(.note-pack) {
    margin-top: calc(-1 * var(--aula-space-3));
  }
  .weekend-day + .weekend-day {
    margin-top: var(--aula-space-6);
  }
  .facts + .blocks {
    margin-top: var(--aula-space-4);
  }
  .weekend-title {
    margin-bottom: var(--aula-space-2);
  }
  .weekend-item {
    min-width: 0;
  }
  .rows > li:has(> .focus-day, > .day-row[open]) + li,
  .rows > li + li:has(> .focus-day, > .day-row[open]) {
    border-top-color: transparent;
  }
  /* A week's rows need wider columns; one child's open day spreads its blocks. */
  .week .several {
    --aula-column: 340px;
  }
  .large .week .several {
    --aula-column: 460px;
  }
  @container day (min-width: 600px) {
    .week .one .day-body .blocks {
      display: block;
      columns: 2;
      column-gap: var(--aula-space-8);
    }
    .week .one .day-body .blocks > .block {
      break-inside: avoid;
      margin-bottom: var(--aula-space-6);
    }
  }
`;

/**
 * The family's cards: children's faces, the children's bar, the overview's looks, the Important
 * page and the cards that act on Aula. Colour is only the subjects' and a warning's.
 */
export const family = css`
  .face {
    flex: none;
    display: grid;
    place-items: center;
    box-sizing: border-box;
    width: var(--aula-face, calc(40px * var(--aula-scale)));
    height: var(--aula-face, calc(40px * var(--aula-scale)));
    border-radius: 50%;
    object-fit: cover;
    background: var(--aula-fill-strong);
    font-size: calc(var(--aula-face, calc(40px * var(--aula-scale))) * 0.4);
    font-weight: var(--aula-bold);
    line-height: 1;
  }

  /* The children's bar: a face for each child, a tick on each shown, and the looks. */
  .kids-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--aula-space-2) var(--aula-space-4);
  }
  .kid-faces {
    display: flex;
    flex-wrap: wrap;
    gap: var(--aula-space-2);
    min-width: 0;
  }
  .kid-face {
    --aula-face: calc(40px * var(--aula-scale));
    display: inline-flex;
    align-items: center;
    gap: var(--aula-space-2);
    min-height: var(--aula-target);
    padding: 0 var(--aula-space-4) 0 var(--aula-space-1);
    border: 0;
    border-radius: 999px;
    background: var(--aula-fill-muted);
    color: var(--aula-text);
    font: inherit;
    font-weight: var(--aula-medium);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .kid-face[aria-pressed="false"] {
    background: none;
    box-shadow: inset 0 0 0 1px var(--aula-line);
    color: var(--aula-text-2);
    font-weight: var(--aula-normal);
  }
  .kid-face[aria-pressed="false"] .face {
    filter: grayscale(1);
    opacity: 0.45;
  }
  .kid-pic {
    position: relative;
    display: inline-flex;
  }
  .kid-tick {
    position: absolute;
    inset-inline-end: -2px;
    bottom: -2px;
    display: grid;
    place-items: center;
    width: calc(16px * var(--aula-scale));
    height: calc(16px * var(--aula-scale));
    border-radius: 50%;
    background: var(--aula-text);
    box-shadow: 0 0 0 2px var(--aula-surface);
    --mdc-icon-size: calc(12px * var(--aula-scale));
  }
  .kid-tick ha-icon {
    color: var(--aula-surface);
  }
  .looks {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border-radius: 999px;
    background: var(--aula-fill-muted);
  }
  .look {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--aula-space-2);
    min-width: calc(var(--aula-target) - 6px);
    min-height: calc(var(--aula-target) - 6px);
    padding: 0 var(--aula-space-3);
    border: 0;
    border-radius: 999px;
    background: none;
    color: var(--aula-text-2);
    font: inherit;
    font-weight: var(--aula-medium);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .look[aria-pressed="true"] {
    background: var(--aula-surface);
    box-shadow: var(--ha-box-shadow-s, 0 1px 2px rgba(0, 0, 0, 0.15));
    color: var(--aula-text);
  }
  .look[aria-pressed="true"] ha-icon {
    color: var(--aula-text);
  }
  @container aula (max-width: 559px) {
    .look {
      padding: 0;
    }
    .look-name {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }

  .face.mini {
    --aula-face: calc(24px * var(--aula-scale));
    box-shadow: 0 0 0 2px var(--aula-surface);
  }
  .face.window-face {
    --aula-face: calc(48px * var(--aula-scale));
  }

  /* Buttons of the windows and the cards that act: one filled for what is sent, the rest quiet. */
  .filled-button,
  .text-button,
  .choice {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--aula-space-2);
    min-height: var(--aula-target);
    padding: 0 var(--aula-space-6);
    border: 0;
    border-radius: 999px;
    background: none;
    color: var(--aula-text);
    font: inherit;
    font-weight: var(--aula-medium);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .filled-button {
    background: var(--aula-text);
    color: var(--aula-surface);
  }
  .filled-button ha-icon {
    color: inherit;
  }
  .filled-button.danger {
    background: var(--error-color, #db4437);
    color: #fff;
  }
  .text-button {
    padding: 0 var(--aula-space-4);
  }
  .choice {
    min-height: calc(40px * var(--aula-scale));
    padding: 0 var(--aula-space-4);
    box-shadow: inset 0 0 0 1px var(--aula-line);
    font-weight: var(--aula-normal);
  }
  .choice[aria-pressed="true"] {
    background: var(--aula-text);
    box-shadow: none;
    color: var(--aula-surface);
    font-weight: var(--aula-medium);
  }
  .face-choice {
    padding-inline-start: var(--aula-space-1);
  }
  .choice[aria-pressed="false"] .face {
    filter: grayscale(1);
    opacity: 0.5;
  }
  .icon-button {
    display: grid;
    place-items: center;
    flex: none;
    width: var(--aula-target);
    height: var(--aula-target);
    margin-inline-end: calc(-1 * var(--aula-space-2));
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  :is(.filled-button, .text-button, .choice, .icon-button):disabled {
    opacity: 0.4;
    cursor: default;
  }
  @media (hover: hover) {
    :is(.text-button, .choice[aria-pressed="false"], .icon-button):not(:disabled):hover {
      background: var(--aula-fill-muted);
    }
    .filled-button:not(:disabled):hover {
      opacity: 0.85;
    }
  }
  :is(.text-button, .choice[aria-pressed="false"], .icon-button):not(:disabled):active {
    background: var(--aula-fill-strong);
  }

  /* The parts of a window that acts. */
  .window-icon {
    display: grid;
    place-items: center;
    flex: none;
    width: calc(48px * var(--aula-scale));
    height: calc(48px * var(--aula-scale));
    border-radius: 50%;
    background: var(--aula-fill-muted);
    --mdc-icon-size: calc(24px * var(--aula-scale));
  }
  .window-icon ha-icon {
    color: var(--aula-text);
  }
  .window-note,
  .info-line,
  .done-line,
  .route,
  .empty-line {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-2);
    line-height: var(--aula-paragraph);
  }
  .window-note,
  .empty-line {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .window-note ha-icon,
  .info-line ha-icon,
  .route ha-icon {
    margin-top: 0.15em;
  }
  .done-line,
  .route.aula,
  .route.tabulex {
    align-items: center;
    font-weight: var(--aula-medium);
  }
  .done-line ha-icon,
  .route.aula ha-icon,
  .route.tabulex ha-icon {
    color: var(--success-color, #43a047);
  }
  .done-line .text-button {
    margin-inline-start: auto;
  }
  .empty-line {
    align-items: center;
    font-size: var(--aula-font-m);
  }
  .window-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--aula-space-2);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
    min-width: 0;
  }
  .field-label {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-bold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .field-help {
    margin: 0;
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .field-count {
    align-self: flex-end;
    color: var(--aula-text-2);
    font-size: var(--aula-font-xs);
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: var(--aula-space-2);
  }
  .text-input {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--aula-target);
    padding: var(--aula-space-2) var(--aula-space-3);
    border: 1px solid var(--aula-line);
    border-radius: var(--aula-radius);
    background: var(--aula-fill-faint);
    color: var(--aula-text);
    font: inherit;
    line-height: var(--aula-paragraph);
    color-scheme: light dark;
  }
  textarea.text-input {
    resize: vertical;
  }
  .text-input:focus-visible {
    outline: 2px solid var(--aula-text);
    outline-offset: -1px;
  }
  .date-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
  .date-field {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .threads {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--aula-line);
    border-radius: var(--aula-radius);
  }
  .thread {
    display: flex;
    align-items: center;
    gap: var(--aula-space-3);
    min-height: var(--aula-target);
    padding: var(--aula-space-2) var(--aula-space-3);
    cursor: pointer;
  }
  .thread + .thread {
    border-top: 1px solid var(--aula-line);
  }
  .thread input {
    flex: none;
    width: calc(20px * var(--aula-scale));
    height: calc(20px * var(--aula-scale));
    margin: 0;
    accent-color: var(--aula-text);
  }
  .thread.closed {
    color: var(--aula-text-2);
    cursor: default;
  }
  .thread-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .thread-subject {
    font-weight: var(--aula-medium);
    overflow-wrap: anywhere;
  }
  .thread-meta {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .answer-days {
    display: flex;
    flex-direction: column;
  }
  .answer-day {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-2) var(--aula-space-3);
    padding: var(--aula-space-2) 0;
  }
  .answer-day + .answer-day {
    border-top: 1px solid var(--aula-line);
  }
  .answer-date {
    flex: 1 1 8em;
    font-weight: var(--aula-medium);
  }
  .answer-times {
    display: flex;
    flex-basis: 100%;
    gap: var(--aula-space-3);
  }
  .answer-split {
    display: flex;
    flex-basis: 100%;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .answer-child {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-2) var(--aula-space-3);
  }
  .answer-who {
    display: inline-flex;
    flex: 1 1 6em;
    align-items: center;
    gap: var(--aula-space-2);
  }
  .answer-for {
    display: flex;
    flex-basis: 100%;
    align-items: center;
    gap: var(--aula-space-2);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .text-button.answer-split-toggle {
    min-height: calc(32px * var(--aula-scale));
    margin-inline-start: auto;
    padding: 0 var(--aula-space-2);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-normal);
  }
  .answer-time {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--aula-space-1);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }

  /* The cards that act: a row for each child or thing, which opens its window. */
  .family-card {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-3);
  }
  .family-rows {
    display: flex;
    flex-direction: column;
    margin: 0 calc(-1 * var(--aula-space-2));
  }
  .family-head {
    margin: 0;
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-medium);
  }
  .label.count {
    background: none;
    box-shadow: inset 0 0 0 1px var(--aula-line);
    color: var(--aula-text-2);
  }
  .family-fold > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: calc(44px * var(--aula-scale));
    color: var(--aula-text-2);
    list-style: none;
    cursor: pointer;
  }
  .family-fold > summary::-webkit-details-marker {
    display: none;
  }
  .family-fold[open] > summary .chevron {
    transform: rotate(180deg);
  }
  .family-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-3);
    box-sizing: border-box;
    width: 100%;
    min-height: calc(56px * var(--aula-scale));
    padding: var(--aula-space-2);
    border: 0;
    border-radius: var(--aula-radius);
    background: none;
    color: inherit;
    font: inherit;
    text-align: start;
  }
  li.family-row {
    border-radius: 0;
  }
  button.family-row {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  @media (hover: hover) {
    button.family-row:hover {
      background: var(--aula-fill-muted);
    }
  }
  button.family-row:active {
    background: var(--aula-fill-strong);
  }
  .family-rows > li + li {
    border-top: 1px solid var(--aula-line);
  }
  /* A narrow card puts a row's label and chevron under its text rather than squeeze the text. */
  .family-text {
    display: flex;
    flex: 1 1 9em;
    flex-direction: column;
    gap: 2px;
    min-width: min(9em, 100%);
  }
  .family-title {
    font-weight: var(--aula-medium);
    overflow-wrap: anywhere;
  }
  .family-sub {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  .chevron-end {
    margin-inline-start: auto;
  }
  .answered-mark {
    color: var(--success-color, #43a047);
  }
  .family-card > .window-actions {
    justify-content: flex-start;
  }

  /* The overview. */
  .overview,
  .ov-main,
  .ov-aside {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
  }
  /* A wide card: the children's day the whole height, the pages and what is coming beside it. Its
     width is in the card's own text size, so that the wall's larger text needs a wider card. */
  @container aula (min-width: 78em) {
    .overview {
      display: grid;
      grid-template-columns: minmax(0, 1fr) calc(320px * var(--aula-scale));
      align-items: start;
      column-gap: var(--aula-space-6);
    }
    .ov-aside {
      padding-inline-start: var(--aula-space-6);
      border-inline-start: 1px solid var(--aula-line);
    }
    .ov-aside .ov-nav {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--aula-space-1);
      padding-top: 0;
      border-top: 0;
    }
    .ov-aside .ov-tile {
      flex-direction: row;
      justify-content: flex-start;
      gap: var(--aula-space-3);
      min-height: calc(52px * var(--aula-scale));
      padding: 0 var(--aula-space-3);
      background: var(--aula-fill-muted);
      font-size: var(--aula-font-m);
    }
    .ov-aside .ov-coming {
      padding-top: 0;
      border-top: 0;
    }
    /* In a row the count stands at the tile's end, not on its icon. */
    .ov-aside .ov-tile-icon {
      display: contents;
    }
    .ov-aside .ov-tile > span:not(.ov-tile-icon) {
      order: 1;
    }
    .ov-aside .ov-badge {
      position: static;
      order: 2;
      margin-inline-start: auto;
    }
  }
  .ov-title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--aula-space-2);
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
  }
  .ov-title .quiet {
    font-size: var(--aula-font-s);
    font-weight: var(--aula-normal);
  }
  .ov-rows,
  .ov-row,
  .ov-col,
  .ov-panel {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
    min-width: 0;
  }
  .ov-rows {
    gap: var(--aula-space-3);
  }
  .ov-row + .ov-row {
    padding-top: var(--aula-space-3);
    border-top: 1px solid var(--aula-line);
  }
  .ov-top,
  .ov-col-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-2);
  }
  /* The hours and the presence share a line, the presence at its end. */
  .ov-status {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-1) var(--aula-space-2);
    min-width: 0;
  }
  .ov-status > .presence,
  .ov-col-head > :is(.presence, .ov-clock) {
    margin-inline-start: auto;
  }
  .ov-who {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    min-width: 0;
  }
  .ov-who .face {
    --aula-face: calc(36px * var(--aula-scale));
  }
  .ov-name {
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
  }
  .ov-hours {
    display: flex;
    flex-wrap: wrap;
    gap: 0 var(--aula-space-2);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-variant-numeric: tabular-nums;
  }
  .ov-free {
    display: none;
    font-size: var(--aula-font-xl);
    font-weight: var(--aula-bold);
    font-variant-numeric: tabular-nums;
  }
  .large .ov-free,
  .ov-panel .ov-free {
    display: block;
  }
  .large .ov-row .ov-hours > .span {
    display: none;
  }
  .ov-clock {
    flex: none;
    width: calc(112px * var(--aula-scale));
    height: calc(112px * var(--aula-scale));
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: inherit;
  }
  button.ov-clock {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .ov-clock-face {
    display: block;
    width: 100%;
    height: 100%;
  }
  .clock-rim {
    fill: var(--aula-fill-muted);
    stroke: var(--aula-line);
    stroke-width: 1;
  }
  .clock-zoom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--aula-space-4);
    width: 100%;
    padding: var(--aula-space-4);
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
  }
  .clock-zoom .ov-clock-face {
    width: min(100%, 70vh, calc(440px * var(--aula-scale)));
    height: auto;
  }
  .clock-zoom-hours {
    font-size: calc(var(--aula-font-2xl) * 1.5);
    font-weight: var(--aula-bold);
    font-variant-numeric: tabular-nums;
  }
  .clock-school {
    fill: none;
    stroke: var(--aula-accent);
    stroke-width: 8;
    stroke-linecap: butt;
  }
  .clock-tick {
    stroke: var(--aula-text-2);
    stroke-width: 1;
  }
  .clock-mark {
    stroke: var(--aula-text);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .clock-hour {
    fill: var(--aula-text);
    font-size: 9.5px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
  }
  .clock-hour-hand,
  .clock-minute-hand {
    stroke: var(--aula-text);
    stroke-linecap: round;
  }
  .clock-hour-hand {
    stroke-width: 5;
  }
  .clock-minute-hand {
    stroke-width: 2.5;
  }
  .clock-pin {
    fill: var(--aula-text);
  }
  .ov-pack {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--aula-space-1) var(--aula-space-2);
  }
  .ov-pack .label ha-icon {
    --mdc-icon-size: 1.15em;
    color: inherit;
  }
  .ov-important,
  .ov-soon,
  .board-important {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    box-sizing: border-box;
    width: 100%;
    min-height: var(--aula-target);
    padding: 0 var(--aula-space-3);
    border: 0;
    border-radius: var(--aula-radius);
    background: var(--aula-fill-muted);
    color: var(--aula-text);
    font: inherit;
    font-weight: var(--aula-medium);
    text-align: start;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .ov-important ha-icon:first-child,
  .board-important ha-icon {
    color: var(--aula-text);
  }
  .ov-important.none {
    background: none;
    box-shadow: inset 0 0 0 1px var(--aula-line);
    color: var(--aula-text-2);
    font-weight: var(--aula-normal);
    cursor: default;
  }
  @media (hover: hover) {
    button:is(.ov-important, .ov-soon, .board-important, .presence, .ov-tile):hover {
      background: var(--aula-fill-strong);
    }
  }
  button:is(.ov-important, .ov-soon, .board-important, .presence, .ov-tile):active {
    background: var(--aula-fill-strong);
  }
  .presence {
    display: inline-flex;
    align-items: center;
    gap: var(--aula-space-1);
    min-height: calc(32px * var(--aula-scale));
    padding: 0 var(--aula-space-3) 0 var(--aula-space-2);
    border: 0;
    border-radius: 999px;
    background: var(--aula-fill-muted);
    color: var(--aula-text);
    font: inherit;
    font-size: var(--aula-font-s);
    font-weight: var(--aula-medium);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    --mdc-icon-size: calc(16px * var(--aula-scale));
  }
  .presence ha-icon {
    color: var(--aula-text);
  }
  .presence.home,
  .presence.coming,
  .presence.away {
    background: none;
    box-shadow: inset 0 0 0 1px var(--aula-line);
    color: var(--aula-text-2);
  }
  .presence:is(.sick, .ask) {
    background: var(--aula-warning-fill);
  }
  .presence:is(.sick, .ask) ha-icon {
    color: var(--aula-warning);
  }
  .ov-cols,
  .ov-board {
    display: grid;
    grid-template-columns: repeat(
      auto-fit,
      minmax(min(100%, calc(260px * var(--aula-scale))), 1fr)
    );
    gap: var(--aula-space-4) var(--aula-space-6);
  }
  .ov-col-head .face {
    --aula-face: calc(48px * var(--aula-scale));
  }
  .ov-soon {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: var(--aula-space-2) var(--aula-space-3);
    background: var(--aula-fill-faint);
    box-shadow: inset 0 0 0 1px var(--aula-line);
    font-weight: var(--aula-normal);
  }
  .ov-soon-head,
  .board-head {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-bold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .ov-soon-item {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    min-height: calc(36px * var(--aula-scale));
  }
  .ov-soon-item + .ov-soon-item {
    border-top: 1px solid var(--aula-line);
  }
  .ov-dot {
    flex: none;
    width: calc(10px * var(--aula-scale));
    height: calc(10px * var(--aula-scale));
    border-radius: 50%;
    background: var(--subject, var(--aula-fill-strong));
  }
  .ov-soon-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ov-soon-text b {
    font-weight: var(--aula-medium);
  }
  .ov-when,
  .ov-more {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    white-space: nowrap;
  }
  .ov-more {
    padding-top: var(--aula-space-1);
  }
  .ov-panel {
    gap: var(--aula-space-3);
  }
  .ov-panel .ov-col-head .face {
    --aula-face: calc(64px * var(--aula-scale));
  }
  .ov-panel .ov-name {
    font-size: var(--aula-font-2xl);
  }
  .board-tiles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--aula-space-2);
  }
  /* Children read the board from across the room: the icon is always large, the word always whole
     and large, and a tile grows wider for a long word rather than shrink it. */
  .board-subject,
  .board-thing {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--aula-space-1);
    box-sizing: border-box;
    min-width: calc(120px * var(--aula-scale));
    max-width: 100%;
    height: calc(120px * var(--aula-scale));
    padding: var(--aula-space-2) var(--aula-space-3);
    border: 0;
    border-radius: calc(14px * var(--aula-scale));
    font: inherit;
    font-size: calc(22px * var(--aula-scale));
    font-weight: var(--aula-bold);
    line-height: 1.1;
    text-align: center;
  }
  .board-subject > ha-icon,
  .board-thing > ha-icon {
    --mdc-icon-size: calc(64px * var(--aula-scale));
  }
  .board-subject > span,
  .board-thing > span:not(.sr) {
    max-width: 100%;
    white-space: nowrap;
  }
  button.board-subject {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .board-subject {
    background: var(--subject, var(--aula-fill-strong));
    color: lch(from var(--subject) calc((49.4 - l) * 1e9) 0 0);
  }
  .board-subject ha-icon {
    color: inherit;
  }
  .board-thing {
    position: relative;
    box-shadow: inset 0 0 0 calc(4px * var(--aula-scale)) var(--subject, var(--aula-text));
  }
  .board-thing-for {
    position: absolute;
    top: calc(8px * var(--aula-scale));
    left: calc(8px * var(--aula-scale));
    display: grid;
    place-items: center;
    width: calc(30px * var(--aula-scale));
    height: calc(30px * var(--aula-scale));
    border-radius: 50%;
    background: var(--subject, var(--aula-fill-strong));
    color: lch(from var(--subject) calc((49.4 - l) * 1e9) 0 0);
  }
  .board-thing .board-thing-for ha-icon {
    --mdc-icon-size: calc(20px * var(--aula-scale));
    color: inherit;
  }
  .board-thing > ha-icon {
    color: var(--aula-text);
  }
  .board-none {
    color: var(--aula-text-2);
    font-size: var(--aula-font-l);
  }
  /* What is important stands apart from the children's tiles: a heading marked in the colour of
     what needs the family, and each note a card in its subject's colour. */
  .ov-important-full {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .ov-important-head {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    margin: 0;
    font-size: var(--aula-font-l);
    font-weight: var(--aula-bold);
  }
  .ov-important-mark {
    display: grid;
    flex: none;
    place-items: center;
    width: calc(32px * var(--aula-scale));
    height: calc(32px * var(--aula-scale));
    border-radius: 50%;
    background: var(--aula-warning);
    color: lch(from var(--aula-warning) calc((49.4 - l) * 1e9) 0 0);
    --mdc-icon-size: calc(18px * var(--aula-scale));
  }
  .ov-important-mark ha-icon {
    color: inherit;
  }
  .ov-important-count {
    display: grid;
    place-items: center;
    min-width: calc(26px * var(--aula-scale));
    height: calc(26px * var(--aula-scale));
    padding: 0 var(--aula-space-2);
    box-sizing: border-box;
    border-radius: 999px;
    background: var(--aula-warning-fill);
    font-size: var(--aula-font-s);
  }
  .note-due > li.due {
    padding: var(--aula-space-3) var(--aula-space-3) var(--aula-space-3) var(--aula-space-4);
    border-inline-start: calc(5px * var(--aula-scale)) solid var(--subject, var(--aula-line));
    border-radius: var(--aula-radius);
    background: color-mix(in srgb, var(--subject, var(--aula-text-2)) 14%, var(--aula-surface));
  }
  .ov-important-more,
  .ov-important-unfold {
    align-self: flex-start;
  }
  .board-important {
    width: auto;
    align-self: flex-start;
    padding: 0 var(--aula-space-4) 0 var(--aula-space-3);
    border-radius: 999px;
  }
  .board-count {
    display: grid;
    place-items: center;
    min-width: calc(24px * var(--aula-scale));
    height: calc(24px * var(--aula-scale));
    border-radius: 999px;
    background: var(--aula-text);
    color: var(--aula-surface);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-bold);
  }
  .ov-nav {
    display: grid;
    grid-template-columns: repeat(var(--tiles, 3), minmax(0, 1fr));
    gap: var(--aula-space-2);
    padding-top: var(--aula-space-3);
    border-top: 1px solid var(--aula-line);
  }
  .ov-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--aula-space-1);
    min-height: calc(64px * var(--aula-scale));
    border: 0;
    border-radius: var(--aula-radius);
    background: none;
    color: var(--aula-text);
    font: inherit;
    font-size: var(--aula-font-s);
    font-weight: var(--aula-medium);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    --mdc-icon-size: calc(24px * var(--aula-scale));
  }
  .ov-tile ha-icon {
    color: var(--aula-text);
  }
  .ov-tile-icon {
    position: relative;
    display: inline-flex;
  }
  .ov-badge {
    position: absolute;
    top: calc(-6px * var(--aula-scale));
    inset-inline-start: calc(100% - 6px * var(--aula-scale));
    display: grid;
    place-items: center;
    box-sizing: border-box;
    min-width: calc(18px * var(--aula-scale));
    height: calc(18px * var(--aula-scale));
    padding: 0 4px;
    border-radius: 999px;
    background: var(--aula-text);
    color: var(--aula-surface);
    font-size: var(--aula-font-xs);
    font-weight: var(--aula-bold);
  }
  .ov-coming {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
    padding-top: var(--aula-space-3);
    border-top: 1px solid var(--aula-line);
  }
  .ov-coming .block-head .quiet {
    font-size: var(--aula-font-s);
    font-weight: var(--aula-normal);
  }
  .ov-coming-row {
    position: relative;
  }
  .ov-coming-row,
  .ov-coming-row > .opens {
    display: flex;
    align-items: center;
    gap: var(--aula-space-3);
    width: 100%;
    min-height: calc(44px * var(--aula-scale));
  }
  .ov-coming-row + .ov-coming-row {
    border-top: 1px solid var(--aula-line);
  }
  .ov-coming-day {
    display: flex;
    flex: none;
    flex-direction: column;
    width: calc(64px * var(--aula-scale));
    font-size: var(--aula-font-s);
    font-weight: var(--aula-medium);
  }
  .ov-coming-day > span {
    color: var(--aula-text-2);
    font-weight: var(--aula-normal);
  }
  .ov-coming-text {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .ov-minis {
    display: flex;
    flex: none;
  }
  .ov-minis .face + .face {
    margin-inline-start: -6px;
  }
  .ov-nav.n-1 {
    --tiles: 1;
  }
  .ov-nav.n-2 {
    --tiles: 2;
  }
  .ov-nav.n-4 {
    --tiles: 4;
  }
  /* What awaits an answer, between the children and the pages: Aula's request, said once. */
  .ov-band {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-1);
    padding-top: var(--aula-space-2);
    border-top: 1px solid var(--aula-line);
  }
  .ov-band-more {
    align-self: flex-start;
  }
  .ov-band-note {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  span.presence {
    cursor: default;
  }
  .family-faces .face.mini,
  .window-faces .face.mini {
    --aula-face: calc(40px * var(--aula-scale));
  }
  .window-faces .face.mini {
    --aula-face: calc(48px * var(--aula-scale));
  }
  .family-faces .face + .face,
  .window-faces .face + .face {
    margin-inline-start: calc(-14px * var(--aula-scale));
  }
  .note-due {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-3);
  }
  .note-due > li {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-1);
  }
  /* On a wide screen a child's row has its face, its day's bar, and what to bring side by side. */
  @container aula (min-width: 840px) {
    .look-rows .ov-row {
      display: grid;
      grid-template-columns: calc(200px * var(--aula-scale)) minmax(0, 1fr) calc(
          300px * var(--aula-scale)
        );
      grid-auto-flow: dense;
      gap: var(--aula-space-2) var(--aula-space-6);
      align-items: start;
    }
    .look-rows .ov-top {
      grid-column: 1;
      grid-row: 1 / span 3;
      flex-direction: column;
      align-items: flex-start;
    }
    .look-rows .ov-status > .presence {
      margin-inline-start: 0;
    }
    .look-rows .ov-top .face {
      --aula-face: calc(48px * var(--aula-scale));
    }
    .look-rows .ov-row > :not(.ov-top, .ov-pack, .ov-important) {
      grid-column: 2;
    }
    .look-rows .ov-row > :is(.ov-pack, .ov-important) {
      grid-column: 3;
    }
    .ov-nav {
      grid-template-columns: repeat(var(--tiles, 3), minmax(0, calc(200px * var(--aula-scale))));
      justify-content: space-around;
    }
  }

  /* The Important page. */
  .note-page {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-4);
  }
  .note-pager {
    display: flex;
    align-items: center;
    gap: var(--aula-space-1);
    margin: calc(-1 * var(--aula-space-2)) calc(-1 * var(--aula-space-2)) 0;
  }
  .note-week {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .note-week b {
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
  }
  .note-week .quiet {
    font-size: var(--aula-font-s);
  }
  .note-page .note-day {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .note-day-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--aula-space-2);
    font-size: var(--aula-font-l);
    font-weight: var(--aula-medium);
  }
  .note-day-head .quiet {
    font-size: var(--aula-font-s);
    font-weight: var(--aula-normal);
  }
  .note-list {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-2);
  }
  .fold .note-list {
    padding-top: var(--aula-space-2);
    opacity: 0.75;
  }
  .note-entry {
    display: flex;
    align-items: flex-start;
    gap: var(--aula-space-3);
    padding: var(--aula-space-3);
    border: 1px solid var(--aula-line);
    border-radius: var(--aula-radius);
    background: var(--aula-fill-faint);
  }
  .note-entry .face {
    --aula-face: calc(32px * var(--aula-scale));
    box-shadow: none;
  }
  .note-entry-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--aula-space-1);
    min-width: 0;
  }
  .note-who {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
    font-weight: var(--aula-medium);
  }
  .note-none {
    display: flex;
    align-items: center;
    gap: var(--aula-space-2);
    color: var(--aula-text-2);
  }
  @container aula (min-width: 720px) {
    .note-page .note-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(calc(320px * var(--aula-scale)), 1fr));
    }
  }
`;
