/**
 * Mounting a card on a fake `hass` at a scenario's time, for testing the elements.
 *
 * @packageDocumentation
 */

import { vi } from "vitest";

import { FakeConnection, fakeHass, present, settle, type FakeHass } from "../fake-hass.ts";
import { scenarioNamed } from "./scenarios.ts";

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
  connection.respond = (message) =>
    item.data(present(item.children.find((child) => child.child_id === message.child_id)));
  const hass = fakeHass({
    connection,
    children: [...item.children],
    timeZone: item.zone,
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
