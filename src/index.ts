/**
 * The Aula Connect cards: the school day, the homework, and the week, from the Aula Connect
 * integration. They only show; nothing in them changes anything in Aula.
 *
 * @packageDocumentation
 */

import { AulaConnectDayCard } from "./cards/day-card.ts";
import { AulaConnectWeekplanCard } from "./cards/weekplan-card.ts";
import { registerCard } from "./cards/register.ts";
import { AulaConnectWeekCard } from "./cards/week-card.ts";
import { DAY_CARD } from "./config/day.ts";
import { WEEKPLAN_CARD } from "./config/weekplan.ts";
import { WEEK_CARD } from "./config/week.ts";

/** The cards' version, set when they are built. */
export const CARD_VERSION = __CARD_VERSION__;

const defined = [
  registerCard(DAY_CARD, AulaConnectDayCard, {
    name: "pickerDayName",
    description: "pickerDayDescription",
    preview: true,
    anchor: "#school-day-card",
  }),
  registerCard(WEEKPLAN_CARD, AulaConnectWeekplanCard, {
    name: "pickerHomeworkName",
    description: "pickerHomeworkDescription",
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
];

if (defined.some(Boolean)) console.info(`AULA-CONNECT-CARD ${CARD_VERSION}`);
