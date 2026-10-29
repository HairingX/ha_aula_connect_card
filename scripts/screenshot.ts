/**
 * Renders the built card with made-up data in Chromium - on a phone and a wall screen, in light
 * and dark themes, in Danish and in American English, and with an orange primary colour - and
 * saves the screenshots in `docs/`. Run `npm run build` first, then `node scripts/screenshot.ts`.
 * A directory as the first argument saves them there instead; `all` as the second adds the
 * weekend, for a review of the card rather than its documentation.
 *
 * @packageDocumentation
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as mdi from "@mdi/js";

import { CHILDREN, weekData } from "../tests/fixtures/week.ts";

interface Page {
  clock: { install(options: { time: Date }): Promise<void> };
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  setContent(html: string): Promise<void>;
  addScriptTag(options: { content: string; type: string }): Promise<void>;
  evaluate<A>(fn: (arg: A) => unknown, arg: A): Promise<unknown>;
  waitForFunction(fn: () => boolean): Promise<unknown>;
  locator(selector: string): { screenshot(options: { path: string }): Promise<void> };
  close(): Promise<void>;
}
interface Browser {
  newPage(options: { deviceScaleFactor: number; colorScheme: string }): Promise<Page>;
  close(): Promise<void>;
}

// Playwright is installed globally in the development container, not as a dependency.
const { chromium } = createRequire(import.meta.url)("playwright") as {
  chromium: { launch(): Promise<Browser> };
};

const ICONS = [
  "mdi:alert-circle-outline",
  "mdi:information-outline",
  "mdi:book-open-variant",
  "mdi:clipboard-text-outline",
  "mdi:note-text-outline",
  "mdi:calendar-blank-outline",
  "mdi:cake-variant-outline",
  "mdi:clock-outline",
  "mdi:chevron-down",
];

function iconPath(icon: string): string {
  const name = `mdi${icon
    .slice(4)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")}`;
  return (mdi as Record<string, string>)[name] ?? "";
}

const THEMES = {
  light: `--primary-color:#009ac7;--primary-text-color:#141414;--secondary-text-color:#5c5c5c;
    --text-primary-color:#fff;--card-background-color:#fff;--secondary-background-color:#f1f2f4;
    --divider-color:rgba(0,0,0,.12);--error-color:#db4437;background:#f2f3f5;`,
  dark: `--primary-color:#009ac7;--primary-text-color:#e6e6e6;--secondary-text-color:#a3a3a3;
    --text-primary-color:#fff;--card-background-color:#1c1c1c;--secondary-background-color:#262626;
    --divider-color:rgba(225,225,225,.14);--error-color:#ef6b5f;background:#111;`,
};

const ORANGE = "--primary-color:#ff6d00;";

const page = (theme: string): string => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 16px; font-family: Roboto, "Segoe UI", system-ui, sans-serif; ${theme} }
</style></head><body></body></html>`;

const shims = `
const icons = ${JSON.stringify(Object.fromEntries(ICONS.map((icon) => [icon, iconPath(icon)])))};
customElements.define("ha-icon", class extends HTMLElement {
  static observedAttributes = ["icon"];
  // Into a shadow root, as Home Assistant's own: children would shift the card's template parts.
  constructor() { super(); this.attachShadow({ mode: "open" }); }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() {
    const size = getComputedStyle(this).getPropertyValue("--mdc-icon-size").trim() || "24px";
    this.style.cssText = "display:inline-flex;width:" + size + ";height:" + size;
    this.shadowRoot.innerHTML = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="' + (icons[this.getAttribute("icon")] || "") + '"/></svg>';
  }
});
customElements.define("ha-card", class extends HTMLElement {
  connectedCallback() {
    this.style.cssText = "display:block;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:12px;";
  }
});
`;

interface Shot {
  file: string;
  theme: keyof typeof THEMES;
  width: number;
  language: string;
  localeLanguage: string;
  primary?: string;
  time?: string;
  review?: boolean;
}

// Thursday of week 44, at the start of the third lesson.
const THURSDAY = "2026-10-29T10:05:00+01:00";

const SHOTS: Shot[] = [
  { file: "screenshot.png", theme: "light", width: 380, language: "da", localeLanguage: "da" },
  { file: "screenshot-dark.png", theme: "dark", width: 380, language: "da", localeLanguage: "da" },
  {
    file: "screenshot-wide-light.png",
    theme: "light",
    width: 820,
    language: "da",
    localeLanguage: "da",
  },
  {
    file: "screenshot-wide-dark.png",
    theme: "dark",
    width: 820,
    language: "da",
    localeLanguage: "da",
  },
  {
    file: "screenshot-en-us.png",
    theme: "light",
    width: 380,
    language: "en",
    localeLanguage: "en-US",
  },
  {
    file: "screenshot-orange.png",
    theme: "light",
    width: 380,
    language: "da",
    localeLanguage: "da",
    primary: ORANGE,
  },
  {
    file: "review-saturday-en-us-dark.png",
    theme: "dark",
    width: 320,
    language: "en",
    localeLanguage: "en-US",
    time: "2026-10-31T09:00:00+01:00",
    review: true,
  },
  {
    file: "review-sunday-wide-orange-dark.png",
    theme: "dark",
    width: 1100,
    language: "en",
    localeLanguage: "en-US",
    primary: ORANGE,
    time: "2026-11-01T09:00:00+01:00",
    review: true,
  },
];

const [directory = "docs", extra] = process.argv.slice(2);
const browser = await chromium.launch();
const bundle = readFileSync("dist/aula-connect-card.js", "utf8");
const data = weekData("2026-10-26");
for (const shot of SHOTS.filter((item) => extra === "all" || item.review !== true)) {
  const tab = await browser.newPage({ deviceScaleFactor: 2, colorScheme: shot.theme });
  await tab.clock.install({ time: new Date(shot.time ?? THURSDAY) });
  await tab.setViewportSize({ width: shot.width + 32, height: 900 });
  await tab.setContent(page(THEMES[shot.theme] + (shot.primary ?? "")));
  await tab.addScriptTag({ content: shims, type: "module" });
  await tab.addScriptTag({ content: bundle, type: "module" });
  await tab.evaluate(
    ({ children, week, settings }) => {
      const hass = {
        language: settings.language,
        locale: {
          language: settings.localeLanguage,
          time_format: "language",
          first_weekday: "language",
          time_zone: "server",
        },
        config: { time_zone: "Europe/Copenhagen" },
        callWS: () => Promise.resolve({ children }),
        connection: {
          subscribeMessage: (callback: (message: unknown) => void) => {
            setTimeout(() => {
              callback(week);
            }, 0);
            return Promise.resolve(() => Promise.resolve());
          },
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        },
      };
      const card = document.createElement("aula-connect-card") as HTMLElement & {
        setConfig(config: unknown): void;
        hass: unknown;
      };
      card.style.width = `${String(settings.width)}px`;
      card.setConfig({ type: "custom:aula-connect-card", children: [1001] });
      card.hass = hass;
      document.body.append(card);
    },
    { children: CHILDREN, week: data, settings: shot },
  );
  await tab.waitForFunction(
    () => document.querySelector("aula-connect-card")?.shadowRoot?.querySelector(".day") != null,
  );
  await tab.locator("aula-connect-card").screenshot({ path: `${directory}/${shot.file}` });
  await tab.close();
}
await browser.close();
