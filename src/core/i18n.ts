/**
 * The cards' texts in Danish and English. Each sentence is one template with `{name}`
 * placeholders; a text with plural forms picks one by `{n}` with `Intl.PluralRules`.
 *
 * @packageDocumentation
 */

import { glue } from "./text.ts";

/** A text, or its singular and plural forms. */
type Text = string | { readonly one: string; readonly other: string };

/** Each text in English, then in Danish. */
const TEXTS = {
  // Status
  loading: ["Loading from Aula…", "Henter fra Aula…"],
  updating: ["Updating from Aula…", "Opdaterer fra Aula…"],
  notLoaded: [
    "Aula Connect is not loaded, or is too old for this card. Install or update the Aula Connect integration.",
    "Aula Connect er ikke indlæst, eller for gammel til dette kort. Installér eller opdatér integrationen Aula Connect.",
  ],
  noChildren: ["Aula Connect has no children set up.", "Aula Connect har ingen børn sat op."],
  childNotFound: [
    "Aula Connect has no child with id {id}.",
    "Aula Connect har intet barn med id {id}.",
  ],
  errorNotFound: [
    "Aula Connect no longer knows this child. Reload the integration.",
    "Aula Connect kender ikke længere dette barn. Genindlæs integrationen.",
  ],
  errorInvalidFormat: [
    "Aula Connect could not read the request: {message}",
    "Aula Connect kunne ikke læse forespørgslen: {message}",
  ],
  errorGeneric: ["Could not load from Aula: {message}", "Kunne ikke hente fra Aula: {message}"],
  // The cards
  regionDay: ["School day – {names}", "Skoledag – {names}"],
  regionHomework: ["Week plan – {names}", "Ugeplan – {names}"],
  regionWeek: ["Week – {names}", "Uge – {names}"],
  pickerDayName: ["Aula Connect · School day", "Aula Connect · Skoledag"],
  pickerDayDescription: [
    "The school day that matters now: today, and from noon the next school day – the week plan, things to bring, timetable and events.",
    "Dagen, der gælder nu: i dag, og fra middag næste skoledag – ugeplanen, hvad der skal med, skema og begivenheder.",
  ],
  pickerHomeworkName: ["Aula Connect · Week plan", "Aula Connect · Ugeplan"],
  pickerHomeworkDescription: [
    "The week plan for the days ahead, by the day it is for: what the teacher marked, the other notes, or both.",
    "Ugeplanen for de kommende dage, samlet efter dagen, den gælder: det, læreren har markeret, det øvrige eller begge.",
  ],
  pickerWeekName: ["Aula Connect · Week", "Aula Connect · Uge"],
  pickerWeekDescription: [
    "The week day by day: timetable, the week plan, events and birthdays.",
    "Ugen dag for dag: skema, ugeplanen, begivenheder og fødselsdage.",
  ],
  // Days
  today: ["Today", "I dag"],
  tomorrow: ["Tomorrow", "I morgen"],
  nextSchoolDay: ["next school day", "næste skoledag"],
  // The rest of today, and the days skipped
  nowLesson: ["Now: {subject}", "Nu: {subject}"],
  schoolEnds: ["school ends {time}", "fri kl. {time}"],
  childEnds: ["{name} ends {time}", "{name} fri kl. {time}"],
  more: ["+{n}", "+{n}"],
  weekend: ["Weekend", "Weekend"],
  noTimetableInAula: ["No timetable in Aula", "Intet skema i Aula"],
  allCancelled: ["All lessons cancelled", "Alle timer aflyst"],
  daysWithoutSchool: [
    { one: "+ {n} day without school", other: "+ {n} days without school" },
    { one: "+ {n} dag uden skole", other: "+ {n} dage uden skole" },
  ],
  noSchoolDays: ["No school days", "Ingen skoledage"],
  noSchoolDaysUntil: ["in Aula up to {day}", "i Aula til og med {day}"],
  schoolStarts: ["school starts {day}", "skolen starter {day}"],
  // Blocks
  blockTask: ["Important", "Vigtigt"],
  blockPack: ["Remember", "Husk"],
  blockTimetable: ["Timetable", "Skema"],
  blockComment: ["Notes", "Noter"],
  blockEvents: ["Events", "Begivenheder"],
  blockBirthdays: ["Birthdays", "Fødselsdage"],
  noHomework: ["Nothing in the week plan.", "Intet i ugeplanen."],
  noWeekPlanHomework: ["No week plan in Aula.", "Ingen ugeplan i Aula."],
  noPack: ["Nothing extra to bring.", "Intet ekstra at huske."],
  noPlan: ["Nothing in the week plan.", "Intet i ugeplanen."],
  noLessons: ["No timetable in Aula.", "Intet skema i Aula."],
  subjects: ["Subjects:", "Fag:"],
  noTimetable: ["No timetable", "Intet skema"],
  nothingThisDay: ["Nothing in Aula for this day.", "Intet i Aula for denne dag."],
  now: ["Now", "Nu"],
  substitute: ["Substitute", "Vikar"],
  breakMinutes: ["Break · {n} min", "Frikvarter · {n} min"],
  teachers: ["Teachers", "Lærere"],
  room: ["Room", "Lokale"],
  weekPlanSource: ["{subject}", "{subject}"],
  weekPlan: ["week plan", "ugeplan"],
  showMore: ["Show more", "Vis mere"],
  showLess: ["Show less", "Vis mindre"],
  showTimetable: ["Show full timetable", "Vis hele skemaet"],
  allDay: ["All day", "Hele dagen"],
  birthdayOf: [
    { one: "{names}'s birthday", other: "{names}'s birthdays" },
    "{names} har fødselsdag",
  ],
  eventCount: [
    { one: "{n} event", other: "{n} events" },
    { one: "{n} begivenhed", other: "{n} begivenheder" },
  ],
  birthdayCount: [
    { one: "{n} birthday", other: "{n} birthdays" },
    { one: "{n} fødselsdag", other: "{n} fødselsdage" },
  ],
  moreFacts: ["+{n} more", "+{n} mere"],
  // The week plan card
  weekShort: ["week {n}", "uge {n}"],
  weeksShort: ["weeks {from}–{to}", "uge {from}–{to}"],
  earlierHomework: ["Earlier ({n})", "Tidligere ({n})"],
  weekPlanNotYet: [
    "Week {n}'s plan isn't in Aula yet.",
    "Ugeplanen for uge {n} er ikke i Aula endnu.",
  ],
  noWeekPlan: [
    "The school has no week plan in Aula, so there is nothing to show.",
    "Skolen har ingen ugeplan i Aula, så der er intet at vise.",
  ],
  // The week card
  weekNumber: ["Week {n}", "Uge {n}"],
  thisWeek: ["This week", "Denne uge"],
  nextWeek: ["Next week", "Næste uge"],
  earlierDays: ["Earlier days ({n})", "Tidligere dage ({n})"],
  weekdaysFolded: ["Monday–Friday ({n})", "Mandag–fredag ({n})"],
  toSaturdayFolded: ["Monday–Saturday ({n})", "Mandag–lørdag ({n})"],
  weekFolded: ["The whole week ({n})", "Hele ugen ({n})"],
  wholeWeek: ["the whole week", "hele ugen"],
  endsAt: ["ends {time}", "fri kl. {time}"],
  // The editor
  editorChildren: ["Children", "Børn"],
  editorChildrenHelper: ["None selected shows every child.", "Ingen valgt viser alle børn."],
  editorOrder: ["Move a block to the top", "Flyt en blok øverst"],
  editorOrderHelper: [
    "Chosen blocks come first, in the order shown here – drag to move them. The rest follow the standard order: Important, Remember, Timetable, Notes; with large text, Remember first.",
    "Valgte blokke vises øverst i den rækkefølge, de står her – træk for at flytte. Resten følger standardrækkefølgen: Vigtigt, Husk, Skema, Noter; med stor tekst Husk først.",
  ],
  editorShow: ["Show or hide blocks", "Vis og skjul blokke"],
  editorNotes: ["Show", "Vis"],
  editorNotesHelper: ["Default: what is marked.", "Standard: det markerede."],
  notesTasks: ["What is marked", "Det markerede"],
  notesComments: ["The other notes", "Det øvrige"],
  notesAll: ["Both", "Begge"],
  editorTimetable: ["Timetable view", "Skemaets visning"],
  editorTimetableHelper: ["Default: compact.", "Standard: kort."],
  editorTimetableCompact: ["Compact – subjects and start times", "Kort – fag og starttider"],
  editorTimetableFull: [
    "Full – end times, rooms and breaks",
    "Fuldt – sluttider, lokaler og frikvarterer",
  ],
  editorInfoLines: ["Lines of a note before Show more", "Linjer i en note før Vis mere"],
  editorInfoLinesHelper: [
    "Default: 6. 0 shows every note whole.",
    "Standard: 6. 0 viser altid hele teksten.",
  ],
  editorSwitch: ["Show the next school day from", "Vis næste skoledag fra kl."],
  editorSwitchHelper: [
    "Empty = 12:00 PM (noon). Before this time the card shows today; 12:00 AM shows today all day.",
    "Tomt felt = 12.00. Før dette klokkeslæt vises i dag; 00.00 viser i dag hele dagen.",
  ],
  editorSize: ["Text size", "Tekststørrelse"],
  editorSizeHelper: ["Default: normal.", "Standard: normal."],
  editorSizeNormal: ["Normal", "Normal"],
  editorSizeLarge: ["Large – for a wall screen", "Stor – til vægskærm"],
  editorWeeks: ["Weeks", "Uger"],
  editorWeeksHelper: ["Default: two weeks.", "Standard: to uger."],
  editorWeeksOne: ["One week – the next school day's", "Én uge – ugen med næste skoledag"],
  editorWeeksTwo: ["Two weeks – this and next", "To uger – denne og næste"],
  editorPacking: ["Things to bring", "Husk-liste"],
  editorPackingHelper: [
    "Things to bring when the subject is on the timetable. The card also quotes the week plan's reminders (husk, medbring, tag … med).",
    "Ting der skal med, når faget er på skemaet. Kortet citerer også ugeplanens sætninger med »husk«, »medbring« og »tag … med«.",
  ],
  editorPackingList: ["Subjects and things", "Fag og ting"],
  editorPackingSubject: ["Subject", "Fag"],
  editorPackingItems: ["Things", "Ting"],
  editorSubjectNames: ["Subject names", "Fagnavne"],
  editorSubjectNamesHelper: [
    "The card knows the common abbreviations (DAN, MAT, IDR …); correct or add names here.",
    "Kortet kender de almindelige forkortelser (DAN, MAT, IDR …); ret eller tilføj navne her.",
  ],
  editorSubjectNamesList: ["Your names", "Egne navne"],
  editorSubjectAula: ["Name in Aula", "Navn i Aula"],
  editorSubjectName: ["Show as", "Vis som"],
} satisfies Record<string, readonly [english: Text, danish: Text]>;

/** The keys of the cards' texts. */
export type TextKey = keyof typeof TEXTS;

/** A function giving a text in one language, with `{name}` placeholders filled in. */
export type Translate = (
  key: TextKey,
  values?: Readonly<Record<string, string | number>>,
) => string;

/** Returns the cards' language for a Home Assistant language: Danish for `da*`, else English. */
export function cardLanguage(language: string | undefined): "da" | "en" {
  return language?.toLowerCase().startsWith("da") ? "da" : "en";
}

const translators = new Map<string, Translate>();

/**
 * Returns the texts for a Home Assistant language; `glued` joins their dashes and dots to the
 * words beside them, for a card, where no line may begin or end with one.
 */
export function translator(language: string | undefined, glued = false): Translate {
  const lang = cardLanguage(language);
  const key = `${lang}${String(glued)}`;
  let result = translators.get(key);
  if (!result) {
    const plurals = new Intl.PluralRules(lang);
    result = (name, values = {}) => {
      const text: Text = TEXTS[name][lang === "da" ? 1 : 0];
      const template =
        typeof text === "string"
          ? text
          : plurals.select(Number(values.n ?? 0)) === "one"
            ? text.one
            : text.other;
      const filled = template.replace(/\{(\w+)\}/g, (match, value: string) =>
        value in values ? String(values[value]) : match,
      );
      return glued ? glue(filled) : filled;
    };
    translators.set(key, result);
  }
  return result;
}
