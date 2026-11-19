/**
 * Mounting a card on a fake `hass` at a scenario's time, for testing the elements.
 *
 * @packageDocumentation
 */

import { vi } from "vitest";

import type { Child } from "../../src/core/types.ts";
import {
  FakeConnection,
  fakeHass,
  present,
  settle,
  type FakeHass,
  type FakeHassOptions,
} from "../fake-hass.ts";
import { scenarioNamed } from "./scenarios.ts";
import { EVENT_DETAILS } from "./week.ts";

/** A card element as Home Assistant sees it. */
export type Card = HTMLElement & {
  setConfig(config: unknown): void;
  hass: unknown;
  getCardSize(): number;
  updateComplete: Promise<unknown>;
};

const mounted: Card[] = [];

/** Options of a mount. */
export interface MountOptions {
  /** Configuration besides the type. */
  readonly config?: Record<string, unknown>;
  /** Changes the fake `hass` before the card gets it. */
  readonly setup?: (hass: FakeHass) => void;
  /** The time, when not the scenario's. */
  readonly clock?: string;
  /** Home Assistant's language. */
  readonly language?: string;
  /** The children's day as it is now, by child; `aula_connect/today/subscribe` is not answered without it. */
  readonly today?: (child: Child) => unknown;
  /** A child's week, when not the scenario's; undefined holds it back. */
  readonly week?: (child: Child, start: string) => unknown;
  /** The children listed, when not the scenario's. */
  readonly children?: readonly Child[];
  /** What other commands answer, by their type. */
  readonly commands?: FakeHassOptions["commands"];
  /** Home Assistant's entities' states. */
  readonly states?: FakeHassOptions["states"];
}

/** Mounts a card in a scenario, its data answered at once; timers must be fake. */
export async function mount(
  tag: string,
  scenario: string,
  options: MountOptions = {},
): Promise<{ card: Card; hass: FakeHass }> {
  const item = scenarioNamed(scenario);
  vi.setSystemTime(new Date(options.clock ?? item.clock));
  const connection = new FakeConnection();
  const children = options.children ?? item.children;
  connection.respond = (message) => {
    const child = present(children.find((known) => known.child_id === message.child_id));
    if (message.type !== "aula_connect/today/subscribe")
      return options.week ? options.week(child, String(message.start)) : item.data(child);
    return options.today ? options.today(child) : undefined;
  };
  const hass = fakeHass({
    connection,
    children: [...children],
    ...(options.commands === undefined ? {} : { commands: options.commands }),
    ...(options.states === undefined ? {} : { states: options.states }),
    timeZone: item.zone,
    events: EVENT_DETAILS,
    ...(options.language === undefined ? {} : { language: options.language }),
  });
  options.setup?.(hass);
  const card = document.createElement(tag) as Card;
  card.setConfig({ type: `custom:${tag}`, ...options.config });
  card.hass = hass;
  document.body.append(card);
  mounted.push(card);
  await settle();
  await card.updateComplete;
  return { card, hass };
}

/** Removes every mounted card. */
export function unmountAll(): void {
  for (const card of mounted.splice(0)) card.remove();
}

/** Returns the text of an element of a card, its white space collapsed. */
export function text(card: Card, selector = ".body"): string {
  return (present(card.shadowRoot).querySelector(selector)?.textContent ?? "")
    .replace(/\u2060/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns every element of a card that a selector matches. */
export function all(card: Card, selector: string): Element[] {
  return [...present(card.shadowRoot).querySelectorAll(selector)];
}
