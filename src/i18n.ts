/**
 * The card's texts in Danish and English.
 *
 * @packageDocumentation
 */

const en = {
  thisWeek: "This week",
  nextWeek: "Next week",
  weekNumber: "Week {n}",
  today: "Today",
  tomorrow: "Tomorrow",
  timetable: "Timetable",
  tasks: "Homework and notes",
  events: "Events",
  birthdays: "Birthdays",
  birthdayOf: "{name}'s birthday",
  allDay: "All day",
  noHomework: "No homework",
  nothingPlanned: "Nothing planned",
  noData: "Nothing from Aula this week.",
  loading: "Loading from Aula…",
  updating: "Updating from Aula…",
  notLoaded:
    "Aula Connect is not loaded, or is too old for this card. Install or update the Aula Connect integration.",
  noChildren: "Aula Connect has no children set up.",
  childNotFound: "Aula Connect has no child with id {id}.",
  errorNotFound: "Aula Connect no longer knows this child. Reload the integration.",
  errorInvalidFormat: "Aula Connect could not read the request: {message}",
  errorGeneric: "Could not load from Aula: {message}",
  now: "Now",
  substitute: "Substitute",
  teachers: "Teachers",
  room: "Room",
  lessons: "{n} lessons",
  break: "Break",
  earlierDays: "Earlier days ({n})",
  sectionHomework: "Homework",
  sectionPlan: "Today's plan",
  sectionOther: "Other",
  editorChildren: "Children",
  editorChildrenHelper: "None selected shows every child.",
  editorWeeks: "Weeks",
  editorWeeksHelper: "Default: this and next week.",
  editorWeeksThis: "This week",
  editorWeeksBoth: "This and next week",
  editorShow: "Show",
  editorSections: "Sections for homework and notes",
  editorSectionsHelper:
    "A note goes in the first section whose rules all match; one with no section goes in Other.",
  editorSectionTitle: "Title",
  editorSectionIcon: "Icon",
  editorSectionType: "Type is (task, comment, …)",
  editorSectionSubject: "Subject is",
  editorSectionText: "Title contains",
};

/** The keys of the card's texts. */
export type TextKey = keyof typeof en;

const da: Record<TextKey, string> = {
  thisWeek: "Denne uge",
  nextWeek: "Næste uge",
  weekNumber: "Uge {n}",
  today: "I dag",
  tomorrow: "I morgen",
  timetable: "Skema",
  tasks: "Lektier og noter",
  events: "Begivenheder",
  birthdays: "Fødselsdage",
  birthdayOf: "{name} har fødselsdag",
  allDay: "Hele dagen",
  noHomework: "Ingen lektier",
  nothingPlanned: "Intet planlagt",
  noData: "Intet fra Aula i denne uge.",
  loading: "Henter fra Aula…",
  updating: "Opdaterer fra Aula…",
  notLoaded:
    "Aula Connect er ikke indlæst, eller for gammel til dette kort. Installér eller opdatér integrationen Aula Connect.",
  noChildren: "Aula Connect har ingen børn sat op.",
  childNotFound: "Aula Connect har intet barn med id {id}.",
  errorNotFound: "Aula Connect kender ikke længere dette barn. Genindlæs integrationen.",
  errorInvalidFormat: "Aula Connect kunne ikke læse forespørgslen: {message}",
  errorGeneric: "Kunne ikke hente fra Aula: {message}",
  now: "Nu",
  substitute: "Vikar",
  teachers: "Lærere",
  room: "Lokale",
  lessons: "{n} lektioner",
  break: "Frikvarter",
  earlierDays: "Tidligere dage ({n})",
  sectionHomework: "Lektier",
  sectionPlan: "Dagens plan",
  sectionOther: "Andet",
  editorChildren: "Børn",
  editorChildrenHelper: "Ingen valgt viser alle børn.",
  editorWeeks: "Uger",
  editorWeeksHelper: "Standard: denne og næste uge.",
  editorWeeksThis: "Denne uge",
  editorWeeksBoth: "Denne og næste uge",
  editorShow: "Vis",
  editorSections: "Afsnit for lektier og noter",
  editorSectionsHelper:
    "En note kommer i det første afsnit, hvis regler alle passer; en uden afsnit kommer i Andet.",
  editorSectionTitle: "Titel",
  editorSectionIcon: "Ikon",
  editorSectionType: "Typen er (task, comment, …)",
  editorSectionSubject: "Faget er",
  editorSectionText: "Titlen indeholder",
};

/** A function giving a text in one language, with `{name}` placeholders filled in. */
export type Translate = (key: TextKey, values?: Record<string, string | number>) => string;

/** Returns the card's language for a Home Assistant language: Danish for `da*`, else English. */
export function cardLanguage(language: string | undefined): "da" | "en" {
  return language?.toLowerCase().startsWith("da") ? "da" : "en";
}

/** Returns the texts for a Home Assistant language. */
export function translator(language: string | undefined): Translate {
  const texts = cardLanguage(language) === "da" ? da : en;
  return (key, values = {}) =>
    texts[key].replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    );
}
