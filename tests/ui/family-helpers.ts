/**
 * Driving the family's cards in tests: their buttons, inputs and windows.
 *
 * @packageDocumentation
 */

import { present } from "../fake-hass.ts";
import type { Card } from "../fixtures/mount.ts";

/** Returns a card's shadow root. */
export function root(card: Card): ShadowRoot {
  return present(card.shadowRoot);
}

/** Returns the text of each element a selector matches, its white space collapsed. */
export function texts(card: Card, selector: string): string[] {
  return [...root(card).querySelectorAll(selector)].map((element) =>
    element.textContent.replace(/⁠/g, "").replace(/\s+/g, " ").trim(),
  );
}

/**
 * Returns the element of a kind a selector matches whose text has `label`, or the first without
 * one, as a button unless told otherwise.
 */
export function find<T extends HTMLElement = HTMLButtonElement>(
  card: Card,
  selector: string,
  label?: string,
  kind: abstract new () => T = HTMLButtonElement as unknown as abstract new () => T,
): T {
  const elements = [...root(card).querySelectorAll(selector)].filter(
    (element): element is T => element instanceof kind,
  );
  return present(
    label === undefined
      ? elements[0]
      : elements.find((element) => element.textContent.replace(/\s+/g, " ").includes(label)),
  );
}

/** Taps what a selector matches, and waits for the card to render. */
export async function tap(card: Card, selector: string, label?: string): Promise<void> {
  find(card, selector, label, HTMLElement).click();
  await settled(card);
}

/** Types into an input or a text area, and waits for the card to render. */
export async function type(card: Card, selector: string, value: string): Promise<void> {
  const input = find(card, selector, undefined, HTMLElement) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event("input"));
  await settled(card);
}

/** Lets the card's commands answer and the card render. */
export async function settled(card: Card): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await card.updateComplete;
  }
}

/** Returns the text of the open window; empty without one. */
export function windowText(card: Card): string {
  return (root(card).querySelector("dialog")?.textContent ?? "")
    .replace(/⁠/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
