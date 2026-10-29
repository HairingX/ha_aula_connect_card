/**
 * Listing the cards in Home Assistant's card picker.
 *
 * @packageDocumentation
 */

import { translator, type TextKey } from "../core/i18n.ts";

/** What the card picker lists a card by. */
export interface CustomCardEntry {
  /** The element's name, without `custom:`. */
  readonly type: string;
  /** The name the picker shows, in the user's language. */
  readonly name: string;
  /** What the picker says the card shows, in the user's language. */
  readonly description: string;
  /** Whether the picker shows the card itself as its preview. */
  readonly preview: boolean;
  /** The card's documentation. */
  readonly documentationURL: string;
  /** Offers the card for an entity of Aula Connect, when one is picked first. */
  readonly getEntitySuggestion: (
    hass: { entities?: Record<string, { platform?: string } | undefined> },
    entityId: string,
  ) => { config: { type: string } } | null;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}

/** The repository's README, where each card has a section. */
export const DOCUMENTATION = "https://github.com/HairingX/ha_aula_connect_card";

/** What a card is listed by, besides its element. */
export interface CardListing {
  /** The picker's name, by its text key. */
  readonly name: TextKey;
  /** The picker's description, by its text key. */
  readonly description: TextKey;
  /** Whether the picker shows the card itself. */
  readonly preview: boolean;
  /** The README section, such as `#week-card`. */
  readonly anchor: string;
}

/**
 * Defines a card's element and lists it in the card picker, unless the element is already
 * defined, as when a dashboard loads the bundle twice. Tells whether it defined it. The name and
 * description follow the page's language each time the picker reads them.
 */
export function registerCard(
  tag: string,
  element: CustomElementConstructor,
  listing: CardListing,
): boolean {
  if (customElements.get(tag)) return false;
  customElements.define(tag, element);
  const t = (): ReturnType<typeof translator> => translator(document.documentElement.lang);
  (window.customCards ??= []).push({
    type: tag,
    get name() {
      return t()(listing.name);
    },
    get description() {
      return t()(listing.description);
    },
    preview: listing.preview,
    documentationURL: `${DOCUMENTATION}${listing.anchor}`,
    getEntitySuggestion: (hass, entityId) =>
      hass.entities?.[entityId]?.platform === "aula_connect"
        ? { config: { type: `custom:${tag}` } }
        : null,
  });
  return true;
}
