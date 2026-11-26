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
  regionWeekplan: ["Week plan – {names}", "Ugeplan – {names}"],
  regionWeek: ["Week – {names}", "Uge – {names}"],
  pickerDayName: ["Aula Connect · School day", "Aula Connect · Skoledag"],
  pickerDayDescription: [
    "The school day that matters now: today, and from noon the next school day – the week plan, things to bring, timetable and events.",
    "Dagen, der gælder nu: i dag, og fra middag næste skoledag – ugeplanen, hvad der skal med, skema og begivenheder.",
  ],
  pickerWeekplanName: ["Aula Connect · Week plan", "Aula Connect · Ugeplan"],
  pickerWeekplanDescription: [
    "The week plan for the days ahead, by the day it is for: what is marked, the other notes, or both.",
    "Ugeplanen for de kommende dage, samlet efter dagen, den gælder: det markerede, det øvrige eller begge.",
  ],
  pickerWeekName: ["Aula Connect · Week", "Aula Connect · Uge"],
  pickerWeekDescription: [
    "The week day by day: timetable, the week plan, events and birthdays.",
    "Ugen dag for dag: skema, ugeplanen, begivenheder og fødselsdage.",
  ],
  pickerChildrenName: ["Aula Connect · Children", "Aula Connect · Børn"],
  pickerChildrenDescription: [
    "A face for each child, which shows or hides the child on every Aula card of the page, and the overview's look.",
    "Et ansigt for hvert barn, der viser eller skjuler barnet på alle sidens Aula-kort, og oversigtens udseende.",
  ],
  pickerOverviewName: ["Aula Connect · Overview", "Aula Connect · Overblik"],
  pickerOverviewDescription: [
    "Every child's day at a glance: presence, timetable, things to bring and what is important, the pages, and what is coming.",
    "Alle børnenes dag med et blik: fremmøde, skema, hvad der skal med og det vigtige, siderne, og hvad der sker.",
  ],
  pickerImportantPageName: ["Aula Connect · Important", "Aula Connect · Vigtigt"],
  pickerImportantPageDescription: [
    "What the week plan marks as important for every child, by the day it is for, a week at a time.",
    "Det, ugeplanen markerer som vigtigt, for alle børn, efter dagen det gælder, en uge ad gangen.",
  ],
  pickerSickName: ["Aula Connect · Report sick", "Aula Connect · Sygemelding"],
  pickerSickDescription: [
    "Reports a child sick in Aula, and writes a message, each on its own tap.",
    "Melder et barn sygt i Aula og skriver en besked, hver med sit eget tryk.",
  ],
  pickerVacationRequestsName: [
    "Aula Connect · Vacation requests",
    "Aula Connect · Ferieanmodninger",
  ],
  pickerVacationRequestsDescription: [
    "The institution's vacation requests, answered day by day.",
    "Institutionens ferieanmodninger, besvaret dag for dag.",
  ],
  pickerVacationName: ["Aula Connect · Vacation", "Aula Connect · Ferie"],
  pickerVacationDescription: [
    "The children's registered vacations; register one, or delete one.",
    "Børnenes meldte ferie; meld ferie, eller slet den.",
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
  remember: ["Remember:", "Husk:"],
  blockTimetable: ["Timetable", "Skema"],
  blockComment: ["Notes", "Noter"],
  blockEvents: ["Events", "Begivenheder"],
  blockBirthdays: ["Birthdays", "Fødselsdage"],
  noImportant: ["Nothing in the week plan.", "Intet i ugeplanen."],
  noWeekPlanImportant: ["No week plan in Aula.", "Ingen ugeplan i Aula."],
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
  // A lesson's or an event's window
  close: ["Close", "Luk"],
  aboutTalk: ["About the meeting", "Om samtalen"],
  aboutMeeting: ["About the meeting", "Om mødet"],
  aboutEvent: ["About the event", "Om begivenheden"],
  aboutLesson: ["About the lesson", "Om lektionen"],
  people: ["People", "Deltagere"],
  reply: ["Reply", "Svar"],
  change: ["Change", "Ændring"],
  detailWhole: ["The whole event", "Hele begivenheden"],
  detailPlace: ["Place", "Sted"],
  bookedTime: ["Your time", "Jeres tid"],
  createdBy: ["Created by", "Oprettet af"],
  coOrganizers: ["Co-organisers", "Medarrangører"],
  invited: ["Invited", "Inviterede"],
  answeredOf: [
    { one: "{n} of {of} has answered", other: "{n} of {of} have answered" },
    "{n} af {of} har svaret",
  ],
  yourAnswer: ["Your answer", "Dit svar"],
  answerAccepted: ["Attending", "Deltager"],
  answerDeclined: ["Not attending", "Deltager ikke"],
  answerWaiting: ["Not answered yet", "Ikke besvaret endnu"],
  answerTentative: ["Maybe", "Måske"],
  deadline: ["Reply by", "Svarfrist"],
  deadlinePassed: ["Passed", "Overskredet"],
  attachments: ["Attachments", "Vedhæftede filer"],
  attachmentsInAula: [
    { one: "{n} file – see it in Aula", other: "{n} files – see them in Aula" },
    { one: "{n} fil – se den i Aula", other: "{n} filer – se dem i Aula" },
  ],
  private: ["Private", "Privat"],
  deleted: ["Deleted in Aula", "Slettet i Aula"],
  roleTeacher: ["teacher", "lærer"],
  roleEducator: ["educator", "pædagog"],
  roleLeader: ["head", "leder"],
  typeEvent: ["Event", "Begivenhed"],
  typeSchoolHome: ["Parent–teacher meeting", "Skole-hjem-samtale"],
  typeParents: ["Parents' meeting", "Forældremøde"],
  typeLesson: ["Lesson", "Lektion"],
  typeExcursion: ["Trip", "Tur"],
  eventNotFound: ["Aula no longer has this event.", "Begivenheden findes ikke længere i Aula."],
  eventUnavailable: [
    "The rest could not be fetched from Aula just now. Try again later.",
    "Resten kunne ikke hentes fra Aula lige nu. Prøv igen senere.",
  ],
  eventNotSupported: [
    "Update Aula Connect to see more about events.",
    "Opdatér Aula Connect for at se mere om begivenheder.",
  ],
  // The children's bar
  childrenBar: ["Children shown", "Børn der vises"],
  look: ["Look", "Visning"],
  // The overview
  regionOverview: ["Overview – {names}", "Overblik – {names}"],
  presenceSick: ["Sick", "Syg"],
  presenceGone: ["Gone home {time}", "Gået hjem {time}"],
  presenceComing: ["Comes {time}", "Kommer {time}"],
  presenceNotArrived: ["Not arrived", "Ikke kommet"],
  presenceAbsent: ["Reported absent", "Meldt fraværende"],
  presenceSchool: ["At school until {time}", "I skole til {time}"],
  presenceUntil: ["Here · leaves {time}", "Til stede · går {time}"],
  presenceSince: ["Here since {time}", "Til stede siden {time}"],
  presenceHere: ["Here", "Til stede"],
  presenceTrip: ["On a trip", "På tur"],
  presenceSleeping: ["Sleeping", "Sover"],
  presenceActivity: ["At an activity", "Til aktivitet"],
  presenceToday: ["Today: {state}", "I dag: {state}"],
  presenceTitle: ["{name} today", "{name} i dag"],
  presenceMeta: ["Check-in · {day}", "Komme/gå · {day}"],
  presenceNow: ["Now", "Nu"],
  presenceTimes: ["Times", "Tider"],
  presencePlanned: ["Planned", "Planlagt"],
  presenceActual: ["Today", "I dag"],
  presenceCollects: ["Collected by", "Hentes af"],
  presenceSchoolHours: ["Timetable", "Skema"],
  presenceCame: ["came {time}", "kom {time}"],
  presenceLeft: ["left {time}", "gik {time}"],
  presenceNote: ["From the check-in in Aula.", "Fra komme/gå i Aula."],
  importantNone: ["Nothing important", "Intet vigtigt"],
  importantFor: [
    { one: "{n} important thing for {when}", other: "{n} important things for {when}" },
    { one: "{n} vigtig ting til {when}", other: "{n} vigtige ting til {when}" },
  ],
  importantThen: ["{n} for {when}", "{n} til {when}"],
  whenToday: ["today", "i dag"],
  whenTomorrow: ["tomorrow", "i morgen"],
  inDays: [
    { one: "in {n} day", other: "in {n} days" },
    { one: "om {n} dag", other: "om {n} dage" },
  ],
  importantTitle: ["Important for {name}", "Vigtigt for {name}"],
  importantFrom: ["From {day} on", "Fra {day} og frem"],
  importantAll: ["All that is important", "Alt vigtigt"],
  importantSoon: ["Important soon", "Vigtigt snart"],
  moreCount: ["+ {n} more", "+ {n} mere"],
  endsAtBig: ["Ends {time}", "Fri kl. {time}"],
  boardToday: ["Today you have", "I dag har du"],
  boardTomorrow: ["{day} you have", "{day} har du"],
  boardPack: ["Pack", "Husk at pakke"],
  nothingToPack: ["Nothing special", "Intet særligt"],
  coming: ["Coming up", "Det sker"],
  comingRange: ["the next 7 days", "de næste 7 dage"],
  comingNone: ["Nothing in the calendar", "Intet i kalenderen"],
  pages: ["Pages", "Sider"],
  navImportant: ["Important", "Vigtigt"],
  navWeekPlan: ["Week plan", "Ugeplan"],
  navWeek: ["Week", "Uge"],
  // The Important page
  regionImportantPage: ["Important – {names}", "Vigtigt – {names}"],
  earlierInWeek: ["Earlier this week ({n})", "Tidligere i ugen ({n})"],
  noImportantWeek: [
    "{name} has nothing important in week {n}",
    "{name} har intet vigtigt i uge {n}",
  ],
  noMoreImportantWeek: [
    "{name} has nothing more important in week {n}",
    "{name} har ikke mere vigtigt i uge {n}",
  ],
  // Reporting sick and writing a message
  sickTitle: ["Illness", "Sygdom"],
  reportSick: ["Report {name} sick", "Meld {name} syg"],
  sickToday: ["Reported sick today", "Meldt syg i dag"],
  sickSince: ["Ill since {day}", "Syg siden {day}"],
  sickRoute: ["Reported sick at {institution}", "Meldes syg hos {institution}"],
  sickFinal: [
    "The sick report can't be taken back from here.",
    "Sygemeldingen kan ikke fortrydes herfra.",
  ],
  sickRouteNone: [
    "{name} can't be reported sick from here. Report sick in Aula.",
    "{name} kan ikke meldes syg herfra. Meld syg i Aula.",
  ],
  sendAs: ["Send as", "Send som"],
  sickConfirm: ["Report sick", "Meld syg"],
  sickDone: ["{name} is reported sick today", "{name} er meldt syg i dag"],
  undo: ["Undo", "Fortryd"],
  undone: ["The report is taken back", "Sygemeldingen er taget tilbage"],
  writeQuestion: ["Write a message?", "Skriv en besked?"],
  writeMessage: ["Write a message", "Skriv en besked"],
  writeTitle: ["Write about {name}", "Skriv om {name}"],
  messageLabel: ["Message", "Besked"],
  threadLabel: ["Thread", "Tråd"],
  threadStale: [
    "The thread used last is from an earlier year, or closed. Choose one.",
    "Tråden, I brugte sidst, er fra et tidligere år eller lukket. Vælg en.",
  ],
  noThreads: [
    "No thread about {name} to write in. Write the first message in Aula.",
    "Ingen tråd om {name} at skrive i. Skriv den første besked i Aula.",
  ],
  skip: ["Skip", "Spring over"],
  send: ["Send", "Send"],
  sent: ["The message is sent", "Beskeden er sendt"],
  sickSinceDay: ["{name} has been ill since {day}", "{name} har været syg siden {day}"],
  wroteYesterday: [
    "You wrote a message from here on the weekday before",
    "I skrev en besked herfra på hverdagen før",
  ],
  sickMessageDefault: [
    "{name} is ill and is staying at home.",
    "{name} er syg og bliver derfor hjemme.",
  ],
  sickReportsOff: [
    "Reporting sick is turned off in Aula Connect's options.",
    "Sygemelding er slået fra i Aula Connects indstillinger.",
  ],
  messagesOff: [
    "Replying in threads is turned off in Aula Connect's options.",
    "Svar i tråde er slået fra i Aula Connects indstillinger.",
  ],
  cancel: ["Cancel", "Annullér"],
  close2: ["Done", "Færdig"],
  sending: ["Sending to Aula…", "Sender til Aula…"],
  // Vacation requests and vacations
  vacationRequests: ["Vacation requests", "Ferieanmodninger"],
  noVacationRequests: ["No vacation requests", "Ingen ferieanmodninger"],
  missingAnswer: ["Awaits an answer", "Mangler svar"],
  answered: ["Answered", "Besvaret"],
  answerByTitle: ["Answer by", "Svar senest"],
  requestDeadlinePassed: ["The deadline has passed", "Fristen er overskredet"],
  holidayOf: ["The holiday: {days}", "Ferien: {days}"],
  dayComing: ["Coming", "Kommer"],
  dayNotComing: ["Not coming", "Kommer ikke"],
  dayArrives: ["Comes", "Kommer kl."],
  dayLeaves: ["Leaves", "Går kl."],
  commentLabel: ["Comment (optional)", "Kommentar (valgfri)"],
  sendAnswer: ["Send answer", "Send svar"],
  answerSent: ["The answer is sent", "Svaret er sendt"],
  answerEveryDay: ["Answer for every day", "Svar for hver dag"],
  vacations: ["Vacation", "Ferie"],
  noVacations: ["No vacation registered", "Ingen ferie meldt"],
  addVacation: ["Register vacation", "Meld ferie"],
  deleteVacation: ["Delete", "Slet"],
  deleteVacationTitle: ["Delete {name}'s vacation?", "Slet {name}s ferie?"],
  vacationFor: ["For", "For"],
  vacationFrom: ["First day", "Første dag"],
  vacationTo: ["Last day", "Sidste dag"],
  vacationSummary: ["Vacation for {names}: {days}", "Ferie for {names}: {days}"],
  vacationAdded: ["The vacation is registered", "Ferien er meldt"],
  vacationDeleted: ["The vacation is deleted", "Ferien er slettet"],
  vacationDays: [
    "The first day is from today on, the last day after it and within a year.",
    "Første dag er fra i dag, sidste dag efter den og inden for et år.",
  ],
  commentCount: ["{n} of 250 characters", "{n} af 250 tegn"],
  vacationsOff: [
    "Registering and deleting vacations is turned off in Aula Connect's options.",
    "Registrering og sletning af ferie er slået fra i Aula Connects indstillinger.",
  ],
  vacationRequestsOff: [
    "Answering vacation requests is turned off in Aula Connect's options.",
    "Svar på ferieanmodninger er slået fra i Aula Connects indstillinger.",
  ],
  // What the cards ask Aula to do
  allHidden: [
    "Every child of this card is hidden in the children's bar.",
    "Alle kortets børn er slået fra i børnebjælken.",
  ],
  actionNeedsUpdate: [
    "Update Aula Connect to do this from here.",
    "Opdatér Aula Connect for at gøre det herfra.",
  ],
  actionNotSupported: [
    "Aula Connect can't do this for this child yet.",
    "Aula Connect kan ikke gøre det for dette barn endnu.",
  ],
  actionNotAllowed: [
    "Aula Connect's options don't allow this. Turn it on there, and try again.",
    "Aula Connects indstillinger tillader ikke dette. Slå det til der, og prøv igen.",
  ],
  actionNotFound: [
    "Aula no longer knows it. Reload, and try again.",
    "Aula kender det ikke længere. Genindlæs, og prøv igen.",
  ],
  actionInvalid: [
    "Aula Connect could not read it: {message}",
    "Aula Connect kunne ikke læse det: {message}",
  ],
  actionFailed: [
    "It could not be done in Aula just now. Try again later.",
    "Det kunne ikke gøres i Aula lige nu. Prøv igen senere.",
  ],
  // The week plan card
  weekShort: ["week {n}", "uge {n}"],
  earlierWeekplan: ["Earlier ({n})", "Tidligere ({n})"],
  weekPlanNotYet: [
    "Week {n}'s plan isn't in Aula yet.",
    "Ugeplanen for uge {n} er ikke i Aula endnu.",
  ],
  noWeekPlan: [
    "There is no week plan in Aula, so there is nothing to show.",
    "Der er ingen ugeplan i Aula, så der er intet at vise.",
  ],
  // The week card
  weekNumber: ["Week {n}", "Uge {n}"],
  thisWeek: ["This week", "Denne uge"],
  nextWeek: ["Next week", "Næste uge"],
  lastWeek: ["Last week", "Sidste uge"],
  weeksAhead: ["In {n} weeks", "Om {n} uger"],
  weeksAgo: ["{n} weeks ago", "For {n} uger siden"],
  previousWeek: ["Previous week", "Forrige uge"],
  weekNav: ["Weeks", "Uger"],
  weeksShown: ["Weeks {from} and {to}", "Uge {from} og {to}"],
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
    "Chosen blocks come first, in the order shown here – drag to move them. The rest follow the standard order: Important with what to bring, Timetable, Notes.",
    "Valgte blokke vises øverst i den rækkefølge, de står her – træk for at flytte. Resten følger standardrækkefølgen: Vigtigt med Husk, Skema, Noter.",
  ],
  editorShow: ["Show or hide blocks", "Vis og skjul blokke"],
  editorNotes: ["Show", "Vis"],
  editorNotesHelper: ["Default: what is marked.", "Standard: det markerede."],
  notesTasks: ["What is marked", "Det markerede"],
  notesComments: ["The other notes", "Det øvrige"],
  notesAll: ["Both", "Begge"],
  editorGroupBy: ["Arrange by", "Opdel efter"],
  editorGroupByHelper: [
    "Child: each child's own, in a column of its own. Block or day: the children lined up side by side, block by block or day by day.",
    "Barn: hvert barns eget, i sin egen kolonne. Blokke eller dage: børnene på linje side om side, blok for blok eller dag for dag.",
  ],
  groupByBlock: ["Block", "Blokke"],
  groupByChild: ["Child", "Barn"],
  groupByDay: ["Day", "Dage"],
  editorTimetable: ["Timetable view", "Skemaets visning"],
  editorTimetableHelper: ["Default: bar.", "Standard: bjælke."],
  editorTimetableCompact: ["Bar", "Bjælke"],
  editorTimetableFull: ["List with rooms and teachers", "Liste med lokaler og lærere"],
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
    "Things to bring when the subject is on the timetable.",
    "Ting der skal med, når faget er på skemaet.",
  ],
  editorPackingList: ["Subjects and things", "Fag og ting"],
  editorPackingSubject: ["Subject", "Fag"],
  editorPackingItems: ["Things", "Ting"],
  editorSubjectNames: ["Subject names", "Fagnavne"],
  editorSubjectNamesHelper: [
    "The card writes the common abbreviations out (DAN as Dansk, IDR as Idræt …); turn it off to show them as Aula has them, and correct or add names here.",
    "Kortet skriver de almindelige forkortelser ud (DAN som Dansk, IDR som Idræt …); slå det fra for at vise dem, som Aula skriver dem, og ret eller tilføj navne her.",
  ],
  editorExpand: ["Write abbreviations out", "Skriv forkortelser ud"],
  editorSubjectNamesList: ["Your names", "Egne navne"],
  editorSubjectAula: ["Name in Aula", "Navn i Aula"],
  editorSubjectName: ["Show as", "Vis som"],
  editorSubjectColor: ["Colour", "Farve"],
  editorSubjectMerge: ["Join a lesson at its time", "Læg ind i en lektion på samme tid"],
  mergeOverlap: ["Where they overlap", "Hvor de overlapper"],
  mergeEqual: ["At the very same time", "Kun ved præcis samme tid"],
  mergeNever: ["Never – a row of its own", "Aldrig – egen række"],
  editorPeople: ["People for children", "Personer for børn"],
  editorPeopleHelper: [
    "A person's name and picture stand in for the child's on every Aula card.",
    "En persons navn og billede bruges i stedet for barnets på alle Aula-kort.",
  ],
  editorPeopleChild: ["Child", "Barn"],
  editorPeoplePerson: ["Person", "Person"],
  editorLook: ["Look", "Visning"],
  editorLookHelper: ["Empty follows the children's bar.", "Tomt felt følger børnebjælken."],
  editorLookSwitch: ["Switch between the overview's looks", "Skift mellem overblikkets visninger"],
  editorSickMessage: ["Message about the illness", "Besked om sygdommen"],
  editorSickMessageHelper: [
    "{name} is the child's first name. Empty: the standard message.",
    "{name} er barnets fornavn. Tomt felt: standardbeskeden.",
  ],
  editorSender: ["Send as", "Send som"],
  editorSenderHelper: [
    "The guardian Aula is told it is from, where both have Aula Connect. Empty: the one used last.",
    "Den forælder, Aula får besked fra, hvor I begge har Aula Connect. Tomt felt: den sidst brugte.",
  ],
  lookRows: ["Rows", "Rækker"],
  lookColumns: ["Columns", "Kolonner"],
  lookBoard: ["Board", "Tavle"],
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
