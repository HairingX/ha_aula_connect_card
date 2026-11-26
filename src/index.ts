/**
 * The Aula Connect cards and the Aula Connect dashboard, from the Aula Connect integration: the
 * school day, the week plan and the week, which only show; the children's bar, the overview and
 * the Important page; and the cards that report a child sick, answer vacation requests and
 * register vacations, which act in Aula only on a tap and once confirmed.
 *
 * @packageDocumentation
 */

import { AulaConnectChildrenCard } from "./cards/children-card.ts";
import { AulaConnectDayCard } from "./cards/day-card.ts";
import { AulaConnectImportantCard } from "./cards/important-card.ts";
import { AulaConnectNewsCard } from "./cards/news-card.ts";
import { AulaConnectOverviewCard } from "./cards/overview-card.ts";
import { registerCard } from "./cards/register.ts";
import { AulaConnectSickCard } from "./cards/sick-card.ts";
import { AulaConnectVacationCard } from "./cards/vacation-card.ts";
import { AulaConnectWeekCard } from "./cards/week-card.ts";
import { AulaConnectWeekplanCard } from "./cards/weekplan-card.ts";
import { DAY_CARD } from "./config/day.ts";
import {
  CHILDREN_CARD,
  IMPORTANT_CARD,
  NEWS_CARD,
  OVERVIEW_CARD,
  SICK_CARD,
  VACATION_CARD,
} from "./config/family.ts";
import { WEEK_CARD } from "./config/week.ts";
import { WEEKPLAN_CARD } from "./config/weekplan.ts";
import { registerStrategies } from "./strategy.ts";

/** The cards' version, set when they are built. */
export const CARD_VERSION = __CARD_VERSION__;

// The strategies first: Home Assistant waits a few seconds for their elements before it gives up.
const strategies = registerStrategies();

const defined = [
  registerCard(DAY_CARD, AulaConnectDayCard, {
    name: "pickerDayName",
    description: "pickerDayDescription",
    preview: true,
    anchor: "#school-day-card",
  }),
  registerCard(WEEKPLAN_CARD, AulaConnectWeekplanCard, {
    name: "pickerWeekplanName",
    description: "pickerWeekplanDescription",
    preview: true,
    anchor: "#week-plan-card",
  }),
  // A week is about 1300 px high: as a preview it would stretch its row of the picker.
  registerCard(WEEK_CARD, AulaConnectWeekCard, {
    name: "pickerWeekName",
    description: "pickerWeekDescription",
    preview: false,
    anchor: "#week-card",
  }),
  registerCard(CHILDREN_CARD, AulaConnectChildrenCard, {
    name: "pickerChildrenName",
    description: "pickerChildrenDescription",
    preview: true,
    anchor: "#childrens-bar",
  }),
  registerCard(OVERVIEW_CARD, AulaConnectOverviewCard, {
    name: "pickerOverviewName",
    description: "pickerOverviewDescription",
    preview: false,
    anchor: "#overview-card",
  }),
  registerCard(IMPORTANT_CARD, AulaConnectImportantCard, {
    name: "pickerImportantPageName",
    description: "pickerImportantPageDescription",
    preview: false,
    anchor: "#important-card",
  }),
  registerCard(NEWS_CARD, AulaConnectNewsCard, {
    name: "pickerNewsName",
    description: "pickerNewsDescription",
    preview: false,
    anchor: "#news-card",
  }),
  registerCard(SICK_CARD, AulaConnectSickCard, {
    name: "pickerSickName",
    description: "pickerSickDescription",
    preview: true,
    anchor: "#sick-card",
  }),
  registerCard(VACATION_CARD, AulaConnectVacationCard, {
    name: "pickerVacationName",
    description: "pickerVacationDescription",
    preview: true,
    anchor: "#vacation-card",
  }),
];

if (strategies || defined.some(Boolean)) console.info(`AULA-CONNECT-CARD ${CARD_VERSION}`);
