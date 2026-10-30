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
    grid-template-columns: repeat(var(--aula-cols, 1), minmax(0, 1fr));
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
    border-top: var(--aula-beside, 1px solid var(--aula-line));
    padding-top: var(--aula-beside, var(--aula-space-6));
  }
  .children > .child + .child::before {
    content: "";
    display: var(--aula-split, none);
    position: absolute;
    top: 0;
    bottom: 0;
    inset-inline-start: calc(var(--aula-space-8) / -2);
    border-inline-start: 1px solid var(--aula-line);
  }
  /* Side by side where each child has room: a third of a wall screen holds three. */
  @container kids (min-width: 592px) {
    .normal .kids-2 {
      --aula-cols: 2;
      --aula-beside: 0;
      --aula-split: block;
    }
  }
  @container kids (min-width: 712px) {
    .large .kids-2,
    .normal .wide-2 {
      --aula-cols: 2;
      --aula-beside: 0;
      --aula-split: block;
    }
  }
  @container kids (min-width: 872px) {
    .large .wide-2 {
      --aula-cols: 2;
      --aula-beside: 0;
      --aula-split: block;
    }
  }
  @container kids (min-width: 904px) {
    .normal .kids-3 {
      --aula-cols: 3;
      --aula-beside: 0;
      --aula-split: block;
    }
  }
  @container kids (min-width: 1100px) {
    .large .kids-3 {
      --aula-cols: 3;
      --aula-beside: 0;
      --aula-split: block;
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
  .label.warning,
  .label.subject {
    white-space: normal;
    overflow-wrap: anywhere;
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
  .pack-label {
    color: var(--aula-text-2);
    font-weight: var(--aula-medium);
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
  /* A quote is word for word, never cut: the things to bring are often at its end. */
  .pack-row.quote .pack-what {
    font-weight: var(--aula-normal);
  }
  .pack-source {
    color: var(--aula-text-2);
    font-size: var(--aula-font-s);
  }
  /* On the wall what to bring is read from across the kitchen, whether set up or quoted. */
  .large .pack-what {
    font-size: calc(var(--ha-font-size-xl, 20px) * 1.5);
    line-height: var(--aula-condensed);
  }
  .large .pack-subjects {
    font-size: calc(var(--ha-font-size-l, 16px) * 1.5);
  }
  .large .pack-item {
    display: block;
  }
  .large .pack-item + .pack-item::before {
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
  /* Folded, a line is the subject and when it begins, the times in a column after the names. */
  .lessons.folded {
    grid-template-columns: minmax(0, max-content) 1fr;
    row-gap: var(--aula-space-1);
  }
  .folded .lesson {
    align-items: baseline;
  }
  .folded time {
    color: var(--aula-text-2);
    white-space: nowrap;
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

  /* An event in the timetable: its icon before its title, its time where a lesson's is. */
  .event-row .lesson-head {
    display: flex;
    align-items: baseline;
    gap: var(--aula-space-2);
    --mdc-icon-size: calc(18px * var(--aula-scale));
  }
  .event-row ha-icon {
    flex: none;
    align-self: center;
  }
  .event-when {
    color: var(--aula-text-2);
    white-space: nowrap;
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
    .normal .single .day-blocks {
      columns: 2;
      column-gap: var(--aula-space-8);
    }
  }
  @container child (min-width: 720px) {
    .large .single .day-blocks {
      columns: 2;
      column-gap: var(--aula-space-8);
    }
  }
  @container child (min-width: 900px) {
    .normal .single .day-blocks {
      columns: 3;
    }
  }
  @container child (min-width: 1350px) {
    .large .single .day-blocks {
      columns: 3;
    }
  }
`;

/** The homework card. */
export const homeworkStyles = css`
  .homework-card {
    container: child / inline-size;
    gap: var(--aula-space-6);
  }
  .meta-icon {
    --mdc-icon-size: calc(18px * var(--aula-scale));
    margin-inline-end: var(--aula-space-1);
    vertical-align: -3px;
  }
  /* What the week plan marks stands on a surface; its other notes follow quietly below. */
  .part > .homework + .plan {
    margin-top: var(--aula-space-4);
  }
  .avatars {
    display: flex;
  }
  .title-who .avatar {
    width: calc(32px * var(--aula-scale));
    height: calc(32px * var(--aula-scale));
    font-size: var(--aula-font-s);
  }
  /* Children's initials overlap, each ringed in the card's colour. */
  .title-who .avatar + .avatar {
    margin-inline-start: calc(-6px * var(--aula-scale));
    box-shadow: 0 0 0 2px var(--aula-surface);
  }
  .title-who .who-name {
    font-size: var(--aula-font-2xl);
    font-weight: var(--aula-normal);
    letter-spacing: -0.012em;
  }
  .title-who .who-meta {
    font-size: var(--aula-font-m);
  }
  .strip .who-name {
    font-size: var(--aula-font-l);
  }
  .homework-card > .strip {
    display: none;
  }
  .hw-days {
    display: flex;
    flex-direction: column;
    gap: var(--aula-space-6);
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
    padding-top: var(--aula-space-2);
  }
  /* One child's days stand side by side in calendar order where there is room. */
  @container child (min-width: 600px) {
    .normal .n-1 .hw-days {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--aula-space-6) var(--aula-space-8);
      align-items: start;
    }
    .homework-card > .fold > summary .chevron {
      margin-inline-start: 0;
    }
  }
  @container child (min-width: 720px) {
    .large .n-1 .hw-days {
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
  .homework-card.tworow > .strip {
    display: none;
  }
`;

/** The week card. */
export const weekStyles = css`
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
  .day-row:not(.focus-day) > summary {
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
  /* Today's bar is on the content's edge, the row closed or open. */
  .today-row,
  .focus-day.today {
    position: relative;
  }
  .today-row::before,
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
    padding: var(--aula-space-2) 0;
  }
  /* An open day is framed, the focus day and any other the user opens alike. */
  .focus-day,
  .day-row[open] {
    container: day / inline-size;
    margin: var(--aula-space-2) 0;
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
  /* A step above the day's block headers, as the homework card's focus day. */
  .open-title,
  .weekend-title {
    font-size: var(--aula-font-xl);
    font-weight: var(--aula-medium);
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
  .day-row[open] .homework {
    background: var(--aula-surface);
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
  @container day (min-width: 600px) {
    .day-body .blocks {
      display: block;
      columns: 2;
      column-gap: var(--aula-space-8);
    }
    .day-body .blocks > .block {
      break-inside: avoid;
      margin-bottom: var(--aula-space-6);
    }
  }
`;
