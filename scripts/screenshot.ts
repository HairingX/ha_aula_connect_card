/**
 * Renders the built card with made-up data in Chromium, in a light and a dark theme, and saves
 * the screenshots in `docs/`. Run `npm run build` first, then `node scripts/screenshot.ts`.
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
  "mdi:bell-outline",
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

const page = (theme: string): string => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 16px; font-family: Roboto, "Segoe UI", system-ui, sans-serif; ${theme} }
  #root { display: flex; gap: 16px; align-items: flex-start; }
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

const browser = await chromium.launch();
const bundle = readFileSync("dist/aula-connect-card.js", "utf8");
const data = weekData("2026-10-26");
for (const [name, theme] of Object.entries(THEMES)) {
  const tab = await browser.newPage({ deviceScaleFactor: 2, colorScheme: name });
  await tab.clock.install({ time: new Date("2026-10-29T10:05:00+01:00") });
  await tab.setViewportSize({ width: 1240, height: 900 });
  await tab.setContent(page(theme));
  await tab.addScriptTag({ content: shims, type: "module" });
  await tab.addScriptTag({ content: bundle, type: "module" });
  await tab.evaluate(
    ({ children, week }) => {
      const hass = {
        language: "da",
        locale: {
          language: "da",
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
      const root = document.createElement("div");
      root.id = "root";
      document.body.append(root);
      const widths = [380, 820];
      for (const width of widths) {
        const card = document.createElement("aula-connect-card") as HTMLElement & {
          setConfig(config: unknown): void;
          hass: unknown;
        };
        card.style.width = `${String(width)}px`;
        card.setConfig({ type: "custom:aula-connect-card", children: [1001] });
        card.hass = hass;
        root.append(card);
      }
    },
    { children: CHILDREN, week: data },
  );
  await tab.waitForFunction(
    () => document.querySelector("aula-connect-card")?.shadowRoot?.querySelector(".lesson") != null,
  );
  await tab.locator("aula-connect-card >> nth=0").screenshot({
    path: name === "light" ? "docs/screenshot.png" : `docs/screenshot-${name}.png`,
  });
  await tab.locator("aula-connect-card >> nth=1").screenshot({
    path: `docs/screenshot-wide-${name}.png`,
  });
  await tab.close();
}
await browser.close();
