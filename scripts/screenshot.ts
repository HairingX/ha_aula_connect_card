/**
 * Renders the built cards with made-up data in Chromium, as Home Assistant shows them: on its own
 * design tokens (`scripts/ha-tokens.css`), in a light or dark theme, with a primary colour as a
 * theme sets it, at a fixed time. Run `npm run build` first, then
 * `node scripts/screenshot.ts [--set docs|review|round|all] [--out DIR] [--only GLOB]`.
 * Playwright with Chromium is installed outside the repository; Roboto is used when installed.
 *
 * Each shot is a scenario of `tests/fixtures/scenarios.ts`, so that it shows a tested case. The
 * page's connection answers only the range the store is expected to ask for: a change of the
 * range policy fails the script.
 *
 * @packageDocumentation
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import * as mdi from "@mdi/js";

import { localTime } from "../src/core/dates.ts";
import { rangeFor } from "../src/core/store.ts";
import { childKey, type Child, type DayRange, type WeekData } from "../src/core/types.ts";
import { scenarioNamed, SCENARIOS, type Scenario } from "../tests/fixtures/scenarios.ts";

interface Page {
  clock: { setFixedTime(time: Date): Promise<void> };
  setContent(html: string): Promise<void>;
  addScriptTag(options: { content: string; type: string }): Promise<void>;
  evaluate<A>(fn: (arg: A) => unknown, arg: A): Promise<unknown>;
  waitForFunction<A>(
    fn: (arg: A) => boolean,
    arg: A,
    options: { timeout: number },
  ): Promise<unknown>;
  locator(selector: string): {
    screenshot(options: { path: string; animations: string }): Promise<void>;
  };
}
interface Context {
  newPage(): Promise<Page>;
  close(): Promise<void>;
}
interface Browser {
  newContext(options: {
    deviceScaleFactor: number;
    colorScheme: string;
    locale: string;
    timezoneId: string;
    viewport: { width: number; height: number };
  }): Promise<Context>;
  close(): Promise<void>;
}

// Playwright is installed globally in the development container, not as a dependency.
const { chromium } = createRequire(import.meta.url)("playwright") as {
  chromium: { launch(): Promise<Browser> };
};

const CARDS = {
  day: "aula-connect-day-card",
  homework: "aula-connect-homework-card",
  week: "aula-connect-card",
} as const;

const PRIMARIES = {
  blue: undefined,
  orange: "#ff6d00",
  yellow: "#ffeb3b",
  indigo: "#3f51b5",
} as const;

/** A shot: a card in a scenario, with a look. */
interface Shot {
  readonly card: keyof typeof CARDS;
  readonly scenario: string;
  readonly width: number;
  readonly theme: "light" | "dark";
  readonly primary: keyof typeof PRIMARIES;
  readonly locale: "da" | "en-US";
  readonly children: 1 | 2;
  readonly large?: boolean;
  /** Configuration besides the children and the size. */
  readonly config?: Readonly<Record<string, unknown>>;
  /** A suffix for the name, for a configuration of its own. */
  readonly tag?: string;
  /** Whether to check the wall screen's first glance: the header and the children's columns. */
  readonly glance?: boolean;
}

// What a family would set up: the things to bring for sports and swimming.
const PACKING = [
  { subject: "Idræt", items: ["Idrætstøj", "Indendørssko", "Håndklæde"] },
  { subject: "Svømning", items: ["Badetøj", "Håndklæde"] },
];

function shot(
  card: Shot["card"],
  scenario: string,
  width: number,
  look: Partial<Omit<Shot, "card" | "scenario" | "width">> = {},
): Shot {
  return {
    card,
    scenario,
    width,
    theme: "light",
    primary: "blue",
    locale: "da",
    children: 1,
    ...look,
  };
}

const ALL_CARDS = Object.keys(CARDS) as Shot["card"][];

const SETS: Record<string, () => Shot[]> = {
  docs: () => [
    shot("day", "thu-1930", 380),
    shot("day", "thu-1010", 380, { theme: "dark" }),
    shot("day", "fri-1240", 380, { primary: "orange", locale: "en-US" }),
    shot("day", "thu-0715", 800, { large: true, children: 2 }),
    shot("homework", "thu-1930", 380),
    shot("homework", "thu-1930", 800, { children: 2 }),
    shot("week", "thu-1010", 380),
    shot("week", "thu-1930", 800),
    shot("week", "thu-1930", 800, { theme: "dark" }),
    shot("week", "sun-1800", 380),
  ],
  review: () => [
    ...ALL_CARDS.flatMap((card) => SCENARIOS.map((item) => shot(card, item.id, 380))),
    ...ALL_CARDS.flatMap((card) =>
      ["thu-1930", "sun-1800"].flatMap((scenario) =>
        (["light", "dark"] as const).map((theme) =>
          shot(card, scenario, 800, { theme, children: 2 }),
        ),
      ),
    ),
    ...ALL_CARDS.flatMap((card) => [
      shot(card, "thu-1010", 380, { theme: "dark", primary: "yellow" }),
      shot(card, "thu-1010", 380, { primary: "orange" }),
      shot(card, "thu-1010", 304, { primary: "indigo" }),
      shot(card, "thu-1010", 380, { locale: "en-US" }),
    ]),
    shot("day", "thu-0715", 800, { large: true, children: 2, glance: true }),
    shot("day", "thu-0715", 800, { large: true, children: 2, theme: "dark" }),
    shot("day", "thu-1930", 380, { config: { order: ["timetable"] }, tag: "order-timetable" }),
    shot("week", "thu-1930", 380, {
      config: {
        show: { timetable: true, tasks: false, events: true, birthdays: true },
        sections: [{ title: "Lektier", type: "task" }],
      },
      tag: "config-0.0.2",
    }),
  ],
  // The first round for the owner: each card at the moments that matter, as the brief asks.
  round: () => [
    shot("day", "thu-0715", 380),
    shot("day", "thu-1530", 380),
    shot("day", "thu-1530", 380, { theme: "dark" }),
    shot("day", "fri-1240", 380),
    shot("day", "fri-1400", 380),
    shot("day", "sun-1800", 380),
    shot("day", "holiday", 380),
    shot("day", "before-holiday", 380),
    shot("day", "thu-1010", 380, { locale: "en-US", primary: "orange" }),
    shot("day", "no-week-plan", 380),
    shot("day", "thu-0715", 800),
    shot("day", "thu-0715", 800, { large: true, children: 2, glance: true }),
    shot("day", "thu-1530", 800, { theme: "dark", children: 2 }),
    shot("day", "two-schools", 800, { children: 2 }),
    shot("homework", "thu-1530", 380),
    shot("homework", "thu-1530", 380, { theme: "dark", children: 2 }),
    shot("homework", "thu-1530", 800),
    shot("homework", "thu-1530", 800, { children: 2 }),
    shot("week", "thu-1000", 380),
    shot("week", "thu-1000", 800),
    shot("week", "sat-1000", 380),
    shot("week", "sat-1000", 800),
    shot("week", "thu-1000", 800, { theme: "dark", children: 2 }),
  ],
};

function name(item: Shot): string {
  return [
    item.card,
    item.scenario,
    String(item.width),
    item.theme,
    item.primary,
    item.locale,
    `${String(item.children)}child`,
    ...(item.large ? ["large"] : []),
    ...(item.tag === undefined ? [] : [item.tag]),
  ].join("-");
}

function option(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index < 0 ? undefined : process.argv[index + 1];
}

function iconPath(icon: string): string {
  const key = `mdi${icon
    .slice(4)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")}`;
  const path = (mdi as Record<string, string | undefined>)[key];
  if (path === undefined) throw new Error(`${icon} is not in @mdi/js`);
  return path;
}

const bundle = readFileSync("dist/aula-connect-card.js", "utf8");
const icons = Object.fromEntries(
  [...new Set(bundle.match(/mdi:[a-z0-9-]+/g) ?? [])].map((icon) => [icon, iconPath(icon)]),
);
const tokens = readFileSync("scripts/ha-tokens.css", "utf8");

// Home Assistant's own ha-card rules; ha-icon draws the path @mdi/js has for the name.
const shims = `
const icons = ${JSON.stringify(icons)};
customElements.define("ha-icon", class extends HTMLElement {
  static observedAttributes = ["icon"];
  constructor() { super(); this.attachShadow({ mode: "open" }); }
  connectedCallback() { this.draw(); }
  attributeChangedCallback() { this.draw(); }
  draw() {
    this.shadowRoot.innerHTML = '<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}svg{width:100%;height:100%}</style><svg viewBox="0 0 24 24"><path fill="currentColor" d="' + (icons[this.getAttribute("icon")] || "") + '"/></svg>';
  }
});
customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML = '<style>:host{background:var(--ha-card-background,var(--card-background-color,white));box-shadow:var(--ha-card-box-shadow,none);box-sizing:border-box;border-radius:var(--ha-card-border-radius,var(--ha-border-radius-lg));border-width:var(--ha-card-border-width,1px);border-style:solid;border-color:var(--ha-card-border-color,var(--divider-color,#e0e0e0));color:var(--primary-text-color);display:block;position:relative}</style><slot></slot>';
  }
});
`;

function page(item: Shot): string {
  const primary = PRIMARIES[item.primary];
  return `<!doctype html>
<html lang="${item.locale.slice(0, 2)}"><head><meta charset="utf-8"><style>
${tokens}
body { margin: 0; padding: 16px; background: var(--primary-background-color);
  font-family: var(--ha-font-family-body); -webkit-font-smoothing: antialiased; }
</style></head><body class="theme-${item.theme}"${primary === undefined ? "" : ` style="--primary-color: ${primary}"`}></body></html>`;
}

interface Mount {
  tag: string;
  config: Record<string, unknown>;
  children: readonly Child[];
  data: Record<string, WeekData>;
  range: DayRange;
  width: number;
  language: string;
  locale: string;
  zone: string;
}

/** Runs in the page: a fake hass whose connection answers the expected range, and the card. */
function mount(arg: Mount): void {
  const errors: string[] = [];
  (window as unknown as { aulaErrors: string[] }).aulaErrors = errors;
  const hass = {
    language: arg.language,
    locale: {
      language: arg.locale,
      time_format: "language",
      first_weekday: "language",
      time_zone: "server",
    },
    config: { time_zone: arg.zone },
    callWS: (message: { type: string }) =>
      message.type === "aula_connect/children"
        ? Promise.resolve({ children: arg.children })
        : Promise.reject(new Error(`unexpected ${message.type}`)),
    connection: {
      subscribeMessage: (
        callback: (message: unknown) => void,
        message: Record<string, unknown>,
      ) => {
        const key = `${String(message.entry_id)}/${String(message.child_id)}`;
        const data = arg.data[key];
        if (
          data === undefined ||
          message.start !== arg.range.start ||
          message.end !== arg.range.end
        ) {
          errors.push(`unexpected subscription ${JSON.stringify(message)}`);
          return Promise.reject(new Error(errors[errors.length - 1]));
        }
        setTimeout(() => {
          callback(data);
        }, 0);
        return Promise.resolve(() => Promise.resolve());
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    },
  };
  const card = document.createElement(arg.tag) as HTMLElement & {
    setConfig(config: unknown): void;
    hass: unknown;
  };
  card.style.display = "block";
  card.style.width = `${String(arg.width)}px`;
  card.setConfig(arg.config);
  card.hass = hass;
  document.body.append(card);
}

// A kitchen tablet of 1280 × 800, less Home Assistant's header.
const FIRST_SCREEN = 800 - 56;

/**
 * Runs in the page: tells what is wrong with the first glance at a wall screen, if anything. The
 * header's title must be the largest text, and the header and each child's first block must
 * begin on the first screen.
 */
function glance(arg: { tag: string; screen: number }): string[] {
  const root = document.querySelector(arg.tag)?.shadowRoot;
  if (!root) return ["no card"];
  const problems: string[] = [];
  const title = root.querySelector(".hero .title");
  const size = (element: Element): number => parseFloat(getComputedStyle(element).fontSize);
  const largest = Math.max(
    ...[...root.querySelectorAll("*")]
      .filter((element) => !title?.contains(element) && !element.closest(".sr"))
      .filter((element) =>
        [...element.childNodes].some(
          (node) => node.nodeType === 3 && (node.textContent ?? "").trim() !== "",
        ),
      )
      .map(size),
  );
  if (!title || size(title) <= largest)
    problems.push(
      `the title is ${String(title && size(title))} px, other text ${String(largest)} px`,
    );
  const top = root.host.getBoundingClientRect().top;
  const hero = root.querySelector(".hero")?.getBoundingClientRect();
  if (!hero || hero.bottom - top > arg.screen)
    problems.push("the header is not on the first screen");
  const children = [...root.querySelectorAll(".child")];
  if (children.length < 2) problems.push("the children are not shown");
  for (const child of children) {
    const first = child.querySelector(".block")?.getBoundingClientRect();
    if (!first || first.top - top > arg.screen)
      problems.push("a child's first block is not on the first screen");
  }
  const tops = new Set(children.map((child) => Math.round(child.getBoundingClientRect().top)));
  if (tops.size !== 1) problems.push("the children are not side by side");
  return problems;
}

function rendered(tag: string): boolean {
  const root = document.querySelector(tag)?.shadowRoot;
  return root?.querySelector(".body") != null && root.querySelector('[aria-busy="true"]') == null;
}

const set = option("--set") ?? "review";
const out = option("--out") ?? (set === "docs" ? "docs" : "screenshots");
const only = option("--only");
const pattern =
  only === undefined
    ? undefined
    : new RegExp(`^${only.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
const shots = (
  set === "all" ? Object.values(SETS).flatMap((make) => make()) : (SETS[set]?.() ?? [])
).filter((item) => pattern === undefined || pattern.test(name(item)));
if (shots.length === 0) throw new Error(`no shots in set ${set}`);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const done: { file: string; item: Shot; scenario: Scenario }[] = [];
for (const item of shots) {
  const scenario = scenarioNamed(item.scenario);
  const children = scenario.children.slice(0, item.children);
  const range = rangeFor(localTime(new Date(scenario.clock), scenario.zone).day);
  if (range.start !== scenario.monday)
    throw new Error(`${scenario.id}: the store would ask for ${range.start}`);
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: item.theme,
    locale: item.locale,
    timezoneId: scenario.zone,
    viewport: { width: item.width + 32, height: 900 },
  });
  const tab = await context.newPage();
  await tab.clock.setFixedTime(new Date(scenario.clock));
  await tab.setContent(page(item));
  await tab.addScriptTag({ content: shims, type: "module" });
  await tab.addScriptTag({ content: bundle, type: "module" });
  const tag = CARDS[item.card];
  await tab.evaluate(mount, {
    tag,
    config: {
      type: `custom:${tag}`,
      children: item.children === 1 ? children.map((child) => child.child_id) : [],
      packing: PACKING,
      ...(item.large ? { size: "large" } : {}),
      ...item.config,
    },
    children: scenario.children,
    data: Object.fromEntries(children.map((child) => [childKey(child), scenario.data(child)])),
    range,
    width: item.width,
    language: item.locale.slice(0, 2),
    locale: item.locale,
    zone: scenario.zone,
  } satisfies Mount);
  await tab.waitForFunction(rendered, tag, { timeout: 10_000 });
  // A second render measures which plan notes are cut short; fonts settle the measures.
  await tab.evaluate(async (selector) => {
    await document.fonts.ready;
    const card = document.querySelector<HTMLElement & { updateComplete: Promise<unknown> }>(
      selector,
    );
    await card?.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await card?.updateComplete;
  }, tag);
  const errors = (await tab.evaluate(
    () => (window as unknown as { aulaErrors: string[] }).aulaErrors,
    null,
  )) as string[];
  if (errors.length > 0) throw new Error(`${name(item)}: ${errors.join("; ")}`);
  if (item.glance === true) {
    const problems = (await tab.evaluate(glance, { tag, screen: FIRST_SCREEN })) as string[];
    if (problems.length > 0) throw new Error(`${name(item)}: ${problems.join("; ")}`);
  }
  const file = `${name(item)}.png`;
  await tab.locator(tag).screenshot({ path: join(out, file), animations: "disabled" });
  done.push({ file, item, scenario });
  await context.close();
}
await browser.close();

// A contact sheet, captioning each shot with its card, scenario and look.
const sheet = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Aula Connect cards: ${set}</title><style>
body { margin: 24px; font: 14px/1.4 Roboto, system-ui, sans-serif; background: #f2f2f2; color: #212121; }
main { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
figure { margin: 0; background: #fff; padding: 12px; border-radius: 8px; }
img { display: block; width: var(--w); }
figcaption { margin-top: 8px; max-width: var(--w); }
figcaption b { display: block; }
</style></head><body>
<h1>Aula Connect cards: ${set} (${String(done.length)} shots)</h1>
<main>
${done
  .map(
    ({ file, item, scenario }) => `<figure style="--w: ${String(Math.min(item.width, 420))}px">
<a href="${file}"><img src="${file}" alt="${item.card} card, ${scenario.title}"></a>
<figcaption><b>${item.card} card · ${scenario.title}</b>${String(item.width)} px · ${item.theme} · ${item.primary} · ${item.locale} · ${String(item.children)} ${item.children === 1 ? "child" : "children"}${item.large ? " · large" : ""}${item.tag === undefined ? "" : ` · ${item.tag}`}<br><code>${file}</code></figcaption>
</figure>`,
  )
  .join("\n")}
</main></body></html>
`;
writeFileSync(join(out, "index.html"), sheet);
console.info(`Wrote ${String(done.length)} shots and index.html to ${out}`);
