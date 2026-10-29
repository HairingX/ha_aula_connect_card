/**
 * The card's styles, on Home Assistant's design tokens with the older theme variables behind.
 *
 * @packageDocumentation
 */

import { css } from "lit";

/** The card's styles. */
export const styles = css`
  :host {
    --acc-space-1: var(--ha-space-1, 4px);
    --acc-space-2: var(--ha-space-2, 8px);
    --acc-space-3: var(--ha-space-3, 12px);
    --acc-space-4: var(--ha-space-4, 16px);
    --acc-font-s: var(--ha-font-size-s, 12px);
    --acc-font-m: var(--ha-font-size-m, 14px);
    --acc-font-l: var(--ha-font-size-l, 16px);
    --acc-font-xl: var(--ha-font-size-xl, 20px);
    --acc-weight-medium: var(--ha-font-weight-medium, 500);
    --acc-weight-bold: var(--ha-font-weight-bold, 600);
    --acc-radius-s: var(--ha-border-radius-sm, 4px);
    --acc-radius-m: var(--ha-border-radius-md, 8px);
    --acc-radius-l: var(--ha-border-radius-lg, 12px);
    --acc-radius-pill: var(--ha-border-radius-pill, 9999px);
    --acc-text: var(--ha-color-text-primary, var(--primary-text-color, #212121));
    --acc-text-secondary: var(--ha-color-text-secondary, var(--secondary-text-color, #616161));
    --acc-divider: var(--divider-color, rgba(0, 0, 0, 0.12));
    --acc-primary: var(--primary-color, #03a9f4);
    --acc-quiet-fill: var(
      --ha-color-fill-neutral-quiet-resting,
      var(--secondary-background-color, rgba(127, 127, 127, 0.1))
    );
    --acc-today-fill: var(
      --ha-color-fill-primary-quiet-resting,
      color-mix(in srgb, var(--acc-primary) 9%, transparent)
    );
    --acc-error: var(--error-color, #db4437);
    --acc-warning: var(--warning-color, #ffa600);
    --acc-info: var(--info-color, #039be5);
    display: block;
  }

  ha-card {
    overflow: hidden;
  }

  .card {
    container-type: inline-size;
    padding: var(--acc-space-3);
    color: var(--acc-text);
    font-size: var(--acc-font-m);
    line-height: 1.4;
    display: flex;
    flex-direction: column;
    gap: var(--acc-space-4);
  }

  h2,
  h3,
  h4,
  h5,
  p {
    margin: 0;
  }

  ol,
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  ha-icon {
    --mdc-icon-size: 18px;
    flex: none;
    color: var(--acc-text-secondary);
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .alert {
    display: flex;
    gap: var(--acc-space-2);
    align-items: flex-start;
    padding: var(--acc-space-3);
    border-radius: var(--acc-radius-m);
    background: color-mix(in srgb, var(--acc-alert) 12%, transparent);
  }
  .alert ha-icon {
    color: var(--acc-alert);
  }
  .alert.error {
    --acc-alert: var(--acc-error);
  }
  .alert.warning {
    --acc-alert: var(--acc-warning);
  }
  .alert.info {
    --acc-alert: var(--acc-info);
  }

  .loading {
    display: flex;
    gap: var(--acc-space-2);
    align-items: center;
    color: var(--acc-text-secondary);
    padding: var(--acc-space-2) 0;
  }
  .pulse {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--acc-primary);
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse {
      animation: none;
    }
  }

  .child {
    display: flex;
    flex-direction: column;
    gap: var(--acc-space-3);
  }
  .child + .child {
    border-top: 1px solid var(--acc-divider);
    padding-top: var(--acc-space-4);
  }
  .child-header {
    display: flex;
    gap: var(--acc-space-3);
    align-items: center;
  }
  .avatar {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: var(--acc-weight-bold);
    font-size: var(--acc-font-l);
    color: var(--acc-text);
    background: color-mix(in srgb, var(--acc-primary) 24%, transparent);
  }
  .child-names {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .child-names h2 {
    font-size: var(--acc-font-xl);
    font-weight: var(--acc-weight-bold);
    line-height: 1.2;
  }
  .institution {
    color: var(--acc-text-secondary);
    font-size: var(--acc-font-s);
  }

  .weeks {
    display: flex;
    flex-direction: column;
    gap: var(--acc-space-4);
  }
  .week {
    min-width: 0;
  }
  .week + .week {
    border-top: 1px solid var(--acc-divider);
    padding-top: var(--acc-space-3);
  }
  .week-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: var(--acc-font-m);
    font-weight: var(--acc-weight-bold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--acc-text-secondary);
    margin-bottom: var(--acc-space-2);
  }
  .week-number {
    font-weight: var(--acc-weight-medium);
    text-transform: none;
    letter-spacing: 0;
  }
  .days {
    display: flex;
    flex-direction: column;
    gap: var(--acc-space-1);
  }

  .day {
    border-radius: var(--acc-radius-l);
    min-width: 0;
  }
  .day.today {
    background: var(--acc-today-fill);
    box-shadow: inset 3px 0 0 var(--acc-primary);
  }
  .day.past .day-name,
  .day.past .day-summary {
    color: var(--acc-text-secondary);
  }
  .day.past .day-name {
    font-weight: var(--acc-weight-medium);
  }
  summary {
    list-style: none;
    cursor: pointer;
    padding: var(--acc-space-2) var(--acc-space-3);
    border-radius: var(--acc-radius-l);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:focus-visible {
    outline: 2px solid var(--acc-primary);
    outline-offset: -2px;
  }
  .day-head {
    display: flex;
    align-items: center;
    gap: var(--acc-space-2);
    min-width: 0;
  }
  .day-name {
    font-size: var(--acc-font-l);
    font-weight: var(--acc-weight-bold);
    min-width: 0;
  }
  .day-name::first-letter {
    text-transform: uppercase;
  }
  .badge {
    font-size: var(--acc-font-s);
    font-weight: var(--acc-weight-bold);
    padding: 1px var(--acc-space-2);
    border-radius: var(--acc-radius-pill);
    border: 1px solid var(--acc-primary);
    color: var(--acc-text);
  }
  .today .badge {
    background: color-mix(in srgb, var(--acc-primary) 24%, transparent);
  }
  .chevron {
    margin-left: auto;
    transition: transform 0.2s ease;
  }
  details[open] .chevron {
    transform: rotate(180deg);
  }
  details:not([open]) > .day-body {
    display: none;
  }
  details[open] .day-summary {
    display: none;
  }
  .day-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 2px var(--acc-space-3);
    color: var(--acc-text-secondary);
    font-size: var(--acc-font-s);
  }
  .count {
    display: inline-flex;
    align-items: center;
    gap: var(--acc-space-1);
  }
  .count ha-icon {
    --mdc-icon-size: 14px;
  }
  .quiet {
    color: var(--acc-text-secondary);
    font-size: var(--acc-font-s);
  }

  .day-body {
    display: flex;
    flex-direction: column;
    gap: var(--acc-space-3);
    padding: 0 var(--acc-space-3) var(--acc-space-3);
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: var(--acc-space-2);
  }
  .block-title {
    display: flex;
    align-items: center;
    gap: var(--acc-space-2);
    font-size: var(--acc-font-m);
    font-weight: var(--acc-weight-bold);
  }

  .lessons {
    display: flex;
    flex-direction: column;
  }
  .lesson {
    display: grid;
    grid-template-columns: 3.6em minmax(0, 1fr);
    gap: var(--acc-space-3);
    padding: var(--acc-space-1) 0;
  }
  .lesson + .lesson {
    border-top: 1px solid var(--acc-divider);
  }
  .lesson-time {
    display: flex;
    flex-direction: column;
    font-variant-numeric: tabular-nums;
    font-weight: var(--acc-weight-medium);
    line-height: 1.3;
  }
  .lesson-time .end {
    color: var(--acc-text-secondary);
    font-size: var(--acc-font-s);
    font-weight: normal;
  }
  .lesson-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-left: 2px solid var(--acc-divider);
    padding-left: var(--acc-space-3);
  }
  .lesson.now .lesson-main {
    border-left-color: var(--acc-primary);
  }
  .lesson-title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--acc-space-1) var(--acc-space-2);
    font-weight: var(--acc-weight-medium);
    overflow-wrap: anywhere;
  }
  .lesson.cancelled .subject {
    text-decoration: line-through;
    color: var(--acc-text-secondary);
  }
  .lesson-meta {
    color: var(--acc-text-secondary);
    font-size: var(--acc-font-s);
    overflow-wrap: anywhere;
  }
  abbr {
    text-decoration: none;
  }
  .tag {
    font-size: var(--acc-font-s);
    font-weight: var(--acc-weight-medium);
    padding: 0 var(--acc-space-2);
    border-radius: var(--acc-radius-pill);
    background: var(--acc-quiet-fill);
  }
  .now-tag {
    background: color-mix(in srgb, var(--acc-primary) 24%, transparent);
  }
  .cancelled-tag {
    background: color-mix(in srgb, var(--acc-error) 16%, transparent);
  }

  .tasks {
    display: flex;
    flex-direction: column;
    gap: var(--acc-space-2);
  }
  .task {
    display: flex;
    flex-direction: column;
    gap: var(--acc-space-1);
    padding: var(--acc-space-2) var(--acc-space-3);
    border-radius: var(--acc-radius-m);
    background: var(--acc-quiet-fill);
    min-width: 0;
  }
  .task-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--acc-space-1) var(--acc-space-2);
  }
  .chip {
    font-size: var(--acc-font-s);
    font-weight: var(--acc-weight-bold);
    padding: 0 var(--acc-space-2);
    border-radius: var(--acc-radius-pill);
    border: 1px solid var(--acc-divider);
    background: var(--card-background-color, var(--ha-card-background, transparent));
  }
  .task-title {
    font-weight: var(--acc-weight-medium);
    overflow-wrap: anywhere;
  }
  .task-content {
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
  .task-author {
    color: var(--acc-text-secondary);
    font-size: var(--acc-font-s);
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: var(--acc-space-2);
  }
  .item {
    display: flex;
    gap: var(--acc-space-2);
    align-items: flex-start;
  }
  .item-text {
    display: flex;
    flex-wrap: wrap;
    gap: 0 var(--acc-space-2);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .item-time {
    font-variant-numeric: tabular-nums;
    color: var(--acc-text-secondary);
  }
  .item-title {
    font-weight: var(--acc-weight-medium);
  }
  .item-meta {
    color: var(--acc-text-secondary);
  }

  @container (min-width: 640px) {
    .card {
      padding: var(--acc-space-4);
    }
    .weeks.two {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: var(--acc-space-4);
    }
    .weeks.two .week + .week {
      border-top: none;
      padding-top: 0;
      border-left: 1px solid var(--acc-divider);
      padding-left: var(--acc-space-4);
    }
    .weeks.one .days {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }
  }
`;
