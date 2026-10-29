/**
 * The cards' texts in Danish and English. Each sentence is one template with `{name}`
 * placeholders; a text with plural forms picks one by `{n}` with `Intl.PluralRules`.
 *
 * @packageDocumentation
 */

/** A text, or its singular and plural forms. */
type Text = string | { readonly one: string; readonly other: string };

const en = {
  // Status
  loading: "Loading from Aula…",
  updating: "Updating from Aula…",
  notLoaded:
    "Aula Connect is not loaded, or is too old for this card. Install or update the Aula Connect integration.",
  noChildren: "Aula Connect has no children set up.",
  childNotFound: "Aula Connect has no child with id {id}.",
  errorNotFound: "Aula Connect no longer knows this child. Reload the integration.",
  errorInvalidFormat: "Aula Connect could not read the request: {message}",
  errorGeneric: "Could not load from Aula: {message}",
  // The cards
  regionDay: "School day – {names}",
  regionHomework: "Homework – {names}",
  regionWeek: "Week – {names}",
  pickerDayName: "Aula Connect · School day",
  pickerDayDescription:
    "The school day that matters now: today, and from noon the next school day – homework, things to bring, timetable and events.",
  pickerHomeworkName: "Aula Connect · Homework",
  pickerHomeworkDescription: "Homework for the days ahead, by the day it is for.",
  pickerWeekName: "Aula Connect · Week",
  pickerWeekDescription:
    "The week day by day: timetable, homework, the plan for the day, events and birthdays.",
  // Days
  today: "Today",
  tomorrow: "Tomorrow",
  nextSchoolDay: "next school day",
  // The rest of today, and the days skipped
  nowLesson: "Now: {subject}",
  schoolEnds: "school ends {time}",
  childEnds: "{name} ends {time}",
  more: "+{n}",
  weekend: "Weekend",
  noTimetableInAula: "No timetable in Aula",
  daysWithoutSchool: { one: "+ {n} day without school", other: "+ {n} days without school" },
  noSchoolDays: "No school days in Aula up to {day}.",
  // Blocks
  blockHomework: "Homework",
  homeworkToday: "Homework for today",
  homeworkTomorrow: "Homework for tomorrow",
  homeworkDay: "Homework for {day}",
  blockPack: "Remember",
  blockTimetable: "Timetable",
  blockPlan: "Plan for the day",
  blockEvents: "Events",
  blockBirthdays: "Birthdays",
  noHomework: "No homework in the week plan.",
  noTimetable: "No timetable",
  nothingThisDay: "Nothing in Aula for this day.",
  now: "Now",
  substitute: "Substitute",
  breakMinutes: "Break · {n} min",
  teachers: "Teachers",
  room: "Room",
  weekPlanSource: "{subject} · week plan",
  weekPlan: "week plan",
  showMore: "Show more",
  showLess: "Show less",
  allDay: "All day",
  birthdayOf: "{name}'s birthday",
  // The homework card
  homework: "Homework",
  weekShort: "week {n}",
  earlierHomework: "Earlier homework ({n})",
  weekPlanNotYet: "The week plan for week {n} isn't in Aula yet.",
  noWeekPlan: "The school has no week plan in Aula, so there is no homework to show.",
  // The week card
  weekNumber: "Week {n}",
  thisWeek: "This week",
  nextWeek: "Next week",
  earlierDays: "Earlier days ({n})",
  weekdaysFolded: "Monday–Friday ({n})",
  homeworkCount: { one: "Homework ({n})", other: "Homework ({n})" },
  endsAt: "ends {time}",
  // The editor
  editorChildren: "Children",
  editorChildrenHelper: "None selected shows every child.",
  editorOrder: "Show first",
  editorOrderHelper:
    "These come first, in the order you drag them into; the rest follow in the standard order.",
  editorShow: "Show",
  editorTasks: "Homework and notes (earlier setting)",
  editorSwitch: "Show the next school day from",
  editorSwitchHelper:
    "Before this time the card shows today. Default 12:00; 00:00 shows today all day.",
  editorSize: "Text size",
  editorSizeNormal: "Normal",
  editorSizeLarge: "Large – for a wall screen",
  editorWeeks: "Weeks",
  editorWeeksOne: "The week of the day shown",
  editorWeeksTwo: "This week and next",
  editorPacking: "Remember list",
  editorPackingHelper:
    "Things to bring when the subject is on the timetable. The card also quotes the week plan's reminders (husk, medbring, tag … med).",
  editorPackingSubject: "Subject",
  editorPackingItems: "Things",
  editorSubjectNames: "Subject names",
  editorSubjectNamesHelper:
    "The card knows the common abbreviations (DAN, MAT, IDR …); correct or add names here.",
  editorSubjectAula: "Name in Aula",
  editorSubjectName: "Show as",
  // 0.0.2's week card, until it is replaced
  timetable: "Timetable",
  tasks: "Homework and notes",
  events: "Events",
  birthdays: "Birthdays",
  nothingPlanned: "Nothing planned",
  noData: "Nothing from Aula this week.",
  lessons: "{n} lessons",
  break: "Break",
  sectionHomework: "Homework",
  sectionPlan: "Plan for the day",
  sectionOther: "Other",
  editorWeeksHelper: "Default: this and next week.",
  editorWeeksThis: "This week",
  editorWeeksBoth: "This and next week",
  editorSections: "Sections for homework and notes",
  editorSectionsHelper:
    "A note goes in the first section whose rules all match; one with no section goes in Other.",
  editorSectionTitle: "Title",
  editorSectionIcon: "Icon",
  editorSectionType: "Type is (task, comment, …)",
  editorSectionSubject: "Subject is",
  editorSectionText: "Title contains",
} satisfies Record<string, Text>;

/** The keys of the cards' texts. */
export type TextKey = keyof typeof en;

const da: Record<TextKey, Text> = {
  loading: "Henter fra Aula…",
  updating: "Opdaterer fra Aula…",
  notLoaded:
    "Aula Connect er ikke indlæst, eller for gammel til dette kort. Installér eller opdatér integrationen Aula Connect.",
  noChildren: "Aula Connect har ingen børn sat op.",
  childNotFound: "Aula Connect har intet barn med id {id}.",
  errorNotFound: "Aula Connect kender ikke længere dette barn. Genindlæs integrationen.",
  errorInvalidFormat: "Aula Connect kunne ikke læse forespørgslen: {message}",
  errorGeneric: "Kunne ikke hente fra Aula: {message}",
  regionDay: "Skoledag – {names}",
  regionHomework: "Lektier – {names}",
  regionWeek: "Uge – {names}",
  pickerDayName: "Aula Connect · Skoledag",
  pickerDayDescription:
    "Dagen, der gælder nu: i dag, og fra middag næste skoledag – lektier, hvad der skal med, skema og begivenheder.",
  pickerHomeworkName: "Aula Connect · Lektier",
  pickerHomeworkDescription:
    "Lektier for de kommende dage, samlet efter den dag, de skal være lavet til.",
  pickerWeekName: "Aula Connect · Uge",
  pickerWeekDescription:
    "Ugen dag for dag: skema, lektier, dagens plan, begivenheder og fødselsdage.",
  today: "I dag",
  tomorrow: "I morgen",
  nextSchoolDay: "næste skoledag",
  nowLesson: "Nu: {subject}",
  schoolEnds: "fri kl. {time}",
  childEnds: "{name} fri kl. {time}",
  more: "+{n}",
  weekend: "Weekend",
  noTimetableInAula: "Intet skema i Aula",
  daysWithoutSchool: { one: "+ {n} dag uden skole", other: "+ {n} dage uden skole" },
  noSchoolDays: "Ingen skoledage i Aula til og med {day}.",
  blockHomework: "Lektier",
  homeworkToday: "Lektier til i dag",
  homeworkTomorrow: "Lektier til i morgen",
  homeworkDay: "Lektier til {day}",
  blockPack: "Husk",
  blockTimetable: "Skema",
  blockPlan: "Dagens plan",
  blockEvents: "Begivenheder",
  blockBirthdays: "Fødselsdage",
  noHomework: "Ingen lektier i ugeplanen.",
  noTimetable: "Intet skema",
  nothingThisDay: "Intet i Aula for denne dag.",
  now: "Nu",
  substitute: "Vikar",
  breakMinutes: "Frikvarter · {n} min",
  teachers: "Lærere",
  room: "Lokale",
  weekPlanSource: "{subject} · ugeplan",
  weekPlan: "ugeplan",
  showMore: "Vis mere",
  showLess: "Vis mindre",
  allDay: "Hele dagen",
  birthdayOf: "{name} har fødselsdag",
  homework: "Lektier",
  weekShort: "uge {n}",
  earlierHomework: "Tidligere lektier ({n})",
  weekPlanNotYet: "Ugeplanen for uge {n} er ikke i Aula endnu.",
  noWeekPlan: "Skolen har ingen ugeplan i Aula, så der er ingen lektier at vise.",
  weekNumber: "Uge {n}",
  thisWeek: "Denne uge",
  nextWeek: "Næste uge",
  earlierDays: "Tidligere dage ({n})",
  weekdaysFolded: "Mandag–fredag ({n})",
  homeworkCount: { one: "{n} lektie", other: "{n} lektier" },
  endsAt: "fri kl. {time}",
  editorChildren: "Børn",
  editorChildrenHelper: "Ingen valgt viser alle børn.",
  editorOrder: "Vis først",
  editorOrderHelper:
    "Disse vises først, i den rækkefølge du trækker dem i; resten følger i standardrækkefølgen.",
  editorShow: "Vis",
  editorTasks: "Lektier og noter (tidligere indstilling)",
  editorSwitch: "Vis næste skoledag fra kl.",
  editorSwitchHelper:
    "Før dette klokkeslæt vises i dag. Standard 12.00; 00.00 viser i dag hele dagen.",
  editorSize: "Tekststørrelse",
  editorSizeNormal: "Normal",
  editorSizeLarge: "Stor – til vægskærm",
  editorWeeks: "Uger",
  editorWeeksOne: "Ugen med den viste dag",
  editorWeeksTwo: "Denne og næste uge",
  editorPacking: "Husk-liste",
  editorPackingHelper:
    "Ting der skal med, når faget er på skemaet. Kortet citerer også ugeplanens sætninger med »husk«, »medbring« og »tag … med«.",
  editorPackingSubject: "Fag",
  editorPackingItems: "Ting",
  editorSubjectNames: "Fagnavne",
  editorSubjectNamesHelper:
    "Kortet kender de almindelige forkortelser (DAN, MAT, IDR …); ret eller tilføj navne her.",
  editorSubjectAula: "Navn i Aula",
  editorSubjectName: "Vis som",
  timetable: "Skema",
  tasks: "Lektier og noter",
  events: "Begivenheder",
  birthdays: "Fødselsdage",
  nothingPlanned: "Intet planlagt",
  noData: "Intet fra Aula i denne uge.",
  lessons: "{n} lektioner",
  break: "Frikvarter",
  sectionHomework: "Lektier",
  sectionPlan: "Dagens plan",
  sectionOther: "Andet",
  editorWeeksHelper: "Standard: denne og næste uge.",
  editorWeeksThis: "Denne uge",
  editorWeeksBoth: "Denne og næste uge",
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
export type Translate = (
  key: TextKey,
  values?: Readonly<Record<string, string | number>>,
) => string;

/** Returns the cards' language for a Home Assistant language: Danish for `da*`, else English. */
export function cardLanguage(language: string | undefined): "da" | "en" {
  return language?.toLowerCase().startsWith("da") ? "da" : "en";
}

const translators = new Map<"da" | "en", Translate>();

/** Returns the texts for a Home Assistant language. */
export function translator(language: string | undefined): Translate {
  const lang = cardLanguage(language);
  let result = translators.get(lang);
  if (!result) {
    const texts = lang === "da" ? da : en;
    const plurals = new Intl.PluralRules(lang);
    result = (key, values = {}) => {
      const text = texts[key];
      const template =
        typeof text === "string"
          ? text
          : plurals.select(Number(values.n ?? 0)) === "one"
            ? text.one
            : text.other;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match,
      );
    };
    translators.set(lang, result);
  }
  return result;
}
