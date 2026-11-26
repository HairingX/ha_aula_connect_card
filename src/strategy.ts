/**
 * The Aula Connect dashboard, `strategy: {type: custom:aula-connect}`: a sections view with the
 * children's bar, the overview and the cards that act, and the overview's pages as subviews; and
 * a section for one child, `strategy: {type: custom:aula-connect-child, child_id: ...}`.
 *
 * @packageDocumentation
 */

import { fetchChildren } from "./core/api.ts";
import { translator } from "./core/i18n.ts";
import type { HomeAssistant } from "./core/types.ts";
import { DAY_CARD } from "./config/day.ts";
import {
  ABSENCE_ICON,
  CHILDREN_CARD,
  DEFAULT_PATHS,
  HOURS_CARD,
  IMPORTANT_CARD,
  NEWS_CARD,
  NEWS_ICON,
  OVERVIEW_CARD,
  SICK_CARD,
  VACATION_CARD,
} from "./config/family.ts";
import { WEEK_CARD } from "./config/week.ts";
import { WEEKPLAN_CARD } from "./config/weekplan.ts";
import { DOCUMENTATION } from "./cards/register.ts";
import { sharedWith } from "./config/dashboard.ts";
import { AulaConnectDashboardEditor, DASHBOARD_EDITOR } from "./ui/dashboard-editor.ts";

/** The dashboard strategy's name, after `custom:`. */
export const DASHBOARD_STRATEGY = "aula-connect";

/** The dashboard's icon. */
const ICON = "mdi:school-outline";

/** The child's section strategy's name, after `custom:`. */
export const CHILD_STRATEGY = "aula-connect-child";

/** A card of a generated view. */
type CardConfig = Readonly<Record<string, unknown>>;

/** A section of a generated view. */
export interface SectionConfig {
  /** Always a grid. */
  readonly type: "grid";
  /** How many of the view's columns it takes. */
  readonly column_span?: number;
  /** Its cards. */
  readonly cards: readonly CardConfig[];
}

/** A generated view. */
export interface ViewConfig {
  /** Its title. */
  readonly title: string;
  /** Its path in the dashboard. */
  readonly path: string;
  /** Its icon. */
  readonly icon?: string;
  /** Whether it is reached only from another view, with a back arrow. */
  readonly subview?: boolean;
  /** Always sections. */
  readonly type: "sections";
  /** The most columns it has. */
  readonly max_columns: number;
  /** Its sections. */
  readonly sections: readonly SectionConfig[];
}

/** What the dashboard strategy is configured with: its parts, and the cards' shared settings. */
interface DashboardOptions {
  readonly children?: unknown;
  readonly sick?: unknown;
  readonly vacation?: unknown;
  readonly [shared: string]: unknown;
}

function card(
  type: string,
  children: unknown,
  extra: CardConfig = {},
  shared: unknown = {},
): CardConfig {
  return {
    type: `custom:${type}`,
    ...(Array.isArray(children) && children.length > 0 ? { children } : {}),
    ...sharedWith(type, shared),
    ...extra,
  };
}

// A page of the overview: its first section the whole width, the others side by side where the
// screen has room for two columns.
function page(
  title: string,
  path: string,
  icon: string,
  cards: readonly CardConfig[],
  beside: readonly CardConfig[] = [],
): ViewConfig {
  return {
    title,
    path,
    icon,
    subview: true,
    type: "sections",
    max_columns: 2,
    sections: [
      { type: "grid", column_span: 2, cards },
      ...beside.map((item): SectionConfig => ({ type: "grid", column_span: 1, cards: [item] })),
    ],
  };
}

/**
 * Builds the dashboard: the overview's view, the children's bar over it, the whole width; and its
 * pages, each under the bar: Vigtigt, Ugeplan, Uge, and Fravær with the sick card and the Ferie/fri
 * card, unless `sick` and `vacation` leave both out. Each card is given the settings of `config` it
 * has.
 */
export function dashboard(
  config: DashboardOptions,
  language: string | undefined,
): { title: string; views: ViewConfig[] } {
  const t = translator(language);
  const { children } = config;
  const of = (type: string, extra: CardConfig = {}): CardConfig =>
    card(type, children, extra, config);
  const bar = (looks: boolean): CardConfig =>
    of(CHILDREN_CARD, looks ? {} : { look_switch: false });
  const acting = [
    ...(config.sick === false ? [] : [of(SICK_CARD)]),
    ...(config.vacation === false ? [] : [of(VACATION_CARD)]),
  ];
  const overview = of(OVERVIEW_CARD, acting.length > 0 ? {} : { paths: { absence: false } });
  return {
    title: "Aula",
    views: [
      {
        title: "Aula",
        path: "aula",
        icon: ICON,
        type: "sections",
        max_columns: 3,
        sections: [{ type: "grid", column_span: 3, cards: [bar(true), overview] }],
      },
      page(t("navImportant"), DEFAULT_PATHS.important, "mdi:flag-outline", [
        bar(false),
        of(IMPORTANT_CARD),
      ]),
      page(t("navWeekPlan"), DEFAULT_PATHS.weekplan, "mdi:calendar-text-outline", [
        bar(false),
        of(WEEKPLAN_CARD),
      ]),
      page(t("navWeek"), DEFAULT_PATHS.week, "mdi:calendar-week", [bar(false), of(WEEK_CARD)]),
      ...(acting.length > 0
        ? [
            page(
              t("navAbsence"),
              DEFAULT_PATHS.absence,
              ABSENCE_ICON,
              [bar(false)],
              [...acting, of(HOURS_CARD)],
            ),
          ]
        : []),
      page(t("navNews"), DEFAULT_PATHS.news, NEWS_ICON, [bar(false), of(NEWS_CARD)]),
    ],
  };
}

/**
 * Builds a child's section: its name, its school day and its week plan, and reporting it sick.
 * The name is the child's as Aula Connect lists it; without the list, the section has none.
 */
export async function childSection(
  config: { readonly child_id?: unknown },
  hass: Pick<HomeAssistant, "callWS">,
): Promise<SectionConfig> {
  const id = Number(config.child_id);
  if (!Number.isSafeInteger(id)) throw new Error("child_id: must be a child id, such as 1001");
  const list = await fetchChildren(hass.callWS).catch(() => []);
  const name = list.find((child) => child.child_id === id)?.first_name;
  const children = [id];
  return {
    type: "grid",
    cards: [
      ...(name === undefined ? [] : [{ type: "heading", heading: name, heading_style: "title" }]),
      card(DAY_CARD, children),
      card(WEEKPLAN_CARD, children),
      card(SICK_CARD, children),
    ],
  };
}

/** The dashboard strategy's element: Home Assistant asks its class for the dashboard. */
export class AulaConnectStrategy extends HTMLElement {
  /** Returns the visual editor of the dashboard's configuration. */
  static getConfigElement(): HTMLElement {
    return document.createElement(DASHBOARD_EDITOR);
  }

  /** Suggests the new dashboard's title and icon. */
  static getCreateSuggestions(): { title: string; icon: string } {
    return { title: "Aula", icon: ICON };
  }

  /** Builds the dashboard. */
  static generate(
    config: DashboardOptions,
    hass: Pick<HomeAssistant, "language">,
  ): Promise<{ title: string; views: ViewConfig[] }> {
    return Promise.resolve(dashboard(config, hass.language));
  }
}

/** The child's section strategy's element: Home Assistant asks its class for the section. */
export class AulaConnectChildStrategy extends HTMLElement {
  /** Builds the child's section. */
  static generate(
    config: { readonly child_id?: unknown },
    hass: Pick<HomeAssistant, "callWS">,
  ): Promise<SectionConfig> {
    return childSection(config, hass);
  }
}

/** What Home Assistant lists a strategy by, in the dashboard's and the section's pickers. */
export interface CustomStrategyEntry {
  /** The strategy's name, after `custom:`. */
  readonly type: string;
  /** What it builds. */
  readonly strategyType: "dashboard" | "section";
  /** Its name. */
  readonly name: string;
  /** What it builds, in words. */
  readonly description: string;
  /** Its documentation. */
  readonly documentationURL: string;
}

declare global {
  interface Window {
    customStrategies?: CustomStrategyEntry[];
  }
}

/**
 * Defines the strategies' elements and lists them, unless they are defined already, as when a
 * dashboard loads the bundle twice. Tells whether it defined them.
 */
export function registerStrategies(): boolean {
  const tag = `ll-strategy-dashboard-${DASHBOARD_STRATEGY}`;
  if (customElements.get(tag)) return false;
  customElements.define(tag, AulaConnectStrategy);
  customElements.define(`ll-strategy-section-${CHILD_STRATEGY}`, AulaConnectChildStrategy);
  customElements.define(DASHBOARD_EDITOR, AulaConnectDashboardEditor);
  (window.customStrategies ??= []).push(
    {
      type: DASHBOARD_STRATEGY,
      strategyType: "dashboard",
      name: "Aula Connect",
      description: "The children's day, important, week plan and week, and what to act on in Aula.",
      documentationURL: `${DOCUMENTATION}#dashboard`,
    },
    {
      type: CHILD_STRATEGY,
      strategyType: "section",
      name: "Aula Connect · Child",
      description: "One child's school day and week plan, and reporting it sick.",
      documentationURL: `${DOCUMENTATION}#a-childs-section`,
    },
  );
  return true;
}
