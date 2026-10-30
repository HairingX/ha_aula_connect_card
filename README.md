# Aula Connect Cards

Three Home Assistant dashboard cards for the Danish school platform Aula, from the
[Aula Connect](https://github.com/HairingX/ha_aula_connect) integration: **the school day** that
matters now, **the homework** for the days ahead, and **the week** day by day. They are made to be
read on a phone in the evening and on a wall screen in the morning, in Danish or English, and
they only show: nothing in them changes anything in Aula.

| School day, on a phone in the evening                                             | The wall screen, two children                                                                 |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| ![The school day card on a phone](docs/day-thu-1930-380-light-blue-da-1child.png) | ![The school day card on a wall screen](docs/day-thu-1930-800-light-blue-da-2child-large.png) |

| Homework                                                                  | Week                                                              |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| ![The homework card](docs/homework-thu-1930-380-light-blue-da-1child.png) | ![The week card](docs/week-thu-1010-380-light-blue-da-1child.png) |

| During school, in a dark theme                                                        | In English, 12-hour times, an orange primary                                           | The wall in the morning                                                                 |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| ![The school day card in a dark theme](docs/day-thu-1010-380-dark-blue-da-1child.png) | ![The school day card in English](docs/day-fri-1240-380-light-orange-en-US-1child.png) | ![The wall screen in the morning](docs/day-thu-0715-800-light-blue-da-2child-large.png) |

The screenshots show made-up data; no real child, school or teacher.

## Installation

You need [Aula Connect](https://github.com/HairingX/ha_aula_connect) **0.0.4 or later** set up:
the cards read the websocket API that release added.

Through HACS:

1. In HACS, open the menu, choose **Custom repositories**, and add
   `https://github.com/HairingX/ha_aula_connect_card` with the type **Dashboard**.
2. Find **Aula Connect Card** in HACS and download it. HACS adds the dashboard resource; the one
   download holds all three cards.
3. Reload the browser, edit a dashboard, add a card, and choose **Aula Connect · Skoledag**,
   **Aula Connect · Lektier** or **Aula Connect · Uge** (in English: School day, Homework, Week).

Every option can be set in each card's visual editor, or in YAML as below.

## The day the cards show

The cards look at **the school day that matters now**, for each child:

- **Until noon** it is today, when today is a school day.
- **From noon** it is the next school day, as what matters then is tomorrow's homework and bag.
  On a Friday afternoon, a Saturday and a Sunday that is Monday; before a holiday, the first day
  after it.
- The header says which day it is, so that it is never taken for today: **I dag**, **I morgen**,
  or the weekday with its date and "næste skoledag". Today's date tile has a bar in the theme's
  colour.
- A school day is a day with lessons. A weekday without lessons counts when the week plan has a
  note for it or the school an event, as a camp or a trip has; a holiday or a weekend without
  lessons never does. Where a school keeps no timetable in Aula, every weekday is a school day.
- `switch_time` moves noon: `switch_time: "15:00"` keeps today until three, and `"00:00"` keeps
  today all day.

While someone touches the card, the day it shows stays put for a minute. What was opened closes
again when the day moves on, and after ten minutes without a touch, so that a shared screen is
always as it should be.

## School day card

`type: custom:aula-connect-day-card` - the day that matters now, for the phone and the wall.

![The school day card with the whole timetable unfolded](docs/day-thu-1930-380-light-blue-da-1child-timetable-open.png)

- **Above the header**, after noon: what is left of today ("I dag · fri kl. 13.40", with several
  children each child's end), and the days passed over when they are not just a weekend: a
  Saturday's flea market, a holiday with its dates, a weekday with no timetable.
- **The header**: the day, its date, and under it the school hours on a line of their own; then
  each whole-day event on its own line with its icon (three of four or more, and "+2 mere"
  unfolds the rest), and the day's birthdays as one line: "Alma, Bo og Carl har fødselsdag".
  Before a holiday it names the holiday, its dates and the day school starts again.
- **The blocks**, in this order unless you choose another:
  - **Lektier** (homework) for that day, every note in full: homework is never folded.
  - **Husk** (remember): the things to bring for the day's subjects, from your
    [packing rules](#things-to-bring), and the week plan's own reminders, quoted word for word.
  - **Skema** (timetable), folded to a line per subject with when it begins - "Dansk 08.00",
    "Matematik 10.05" - and what is news: a substitute, a cancelled lesson. "Vis hele skemaet"
    unfolds the whole timetable with end times, rooms, breaks and the lesson going on now.
  - **Dagens plan** (plan for the day): the week plan's other notes; each folds after six lines
    with its own "Vis mere", as a teacher may write fifty.
  - **Begivenheder** (events): the day's events at a time, a line each.

A block with nothing in it for any child is left out, or says so once.

## Homework card

`type: custom:aula-connect-homework-card` - the homework ahead, by the day it is for.

![The homework card with two children](docs/homework-thu-1930-800-light-blue-da-2child.png)

It starts at the day that matters now, then every later day with homework this week and next,
each child's notes under the child's name. A week whose plan is not in Aula yet says so. The
days before are folded into "Tidligere lektier". On a wide card one child's days stand in two
columns, and several children each have a column.

## Week card

`type: custom:aula-connect-card` - the week day by day, for planning. It is the card of earlier
versions, and keeps their configurations working.

![The week card on a wide screen](docs/week-thu-1930-800-light-blue-da-1child.png)

This week and next, a row a day: the day that matters now opened, with its blocks as on the
school day card and the teachers' initials in the timetable; the days before it folded into one
row; the rest closed, each summed up in a line ("08.00–13.40 · 2 lektier", an event, or
"2 begivenheder" and "3 fødselsdage" when there are more). A weekend with something on is one
row, and a holiday's days are one row with its dates. From Friday afternoon this week collapses
and next week opens at Monday:

![The week card on a Sunday evening](docs/week-sun-1800-380-light-blue-da-1child.png)

## Configuration

| Option          | Cards            | Default          | What it does                                                                                                                                                                                                    |
| --------------- | ---------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`      | all              | every child      | The children to show, by Aula's child id, in this order.                                                                                                                                                        |
| `switch_time`   | all              | `"12:00"`        | When the next school day takes over from today. `"00:00"` keeps today all day.                                                                                                                                  |
| `size`          | all              | `normal`         | `large` for a wall screen: text 1.5 times as large, the wall's sizes from a 480 px card, and Husk first.                                                                                                        |
| `subject_names` | all              | none             | [Names](#subject-names) for lesson titles, over the built-in ones.                                                                                                                                              |
| `order`         | school day, week | none             | The blocks to put first, in this order: `homework`, `pack`, `timetable`, `plan`, `events`. The rest follow the standard order: Lektier, Husk, Skema, Dagens plan, Begivenheder; with `size: large`, Husk first. |
| `show`          | school day, week | everything shown | Hide a block with `false`: `homework`, `pack`, `timetable`, `plan`, `events`. `events` and `birthdays` also decide whether the header names whole-day events and birthdays.                                     |
| `timetable`     | school day, week | `compact`        | `compact` folds the timetable to subjects and start times; `full` opens it whole, still to be folded.                                                                                                           |
| `info_lines`    | school day, week | `6`              | The lines of a note of the plan shown before "Vis mere", 0 to 50; `0` shows every note whole.                                                                                                                   |
| `packing`       | school day, week | none             | [Things to bring](#things-to-bring) when a subject is on the timetable.                                                                                                                                         |
| `weeks`         | week             | `2`              | `1` shows the week of the day that matters now, `2` this week and next.                                                                                                                                         |

A school day card in YAML, every option at its default but the children:

```yaml
type: custom:aula-connect-day-card
children: [1001]
switch_time: "12:00"
size: normal
order: [] # homework, pack, timetable, plan, events; those named come first
show:
  homework: true
  pack: true
  timetable: true
  plan: true
  events: true
  birthdays: true
timetable: compact
info_lines: 6
packing: []
subject_names: []
```

The child ids are the integration's; the card's editor lists the children by name.

### Things to bring

**Husk** has two sources, kept apart and each labelled.

Your **packing rules** name what to bring when a subject is on the day's timetable. A rule
matches the subject by any of its names, so `Idræt` matches lessons Aula calls `IDR` or `3.B IDR`:

```yaml
packing:
  - subject: Idræt
    items: [Idrætstøj, Indendørssko, Håndklæde]
  - subject: Svømning
    items: Badetøj
```

**The week plan's reminders** are quoted word for word: a sentence of the day's notes that asks
to bring something - "Husk blokfløjte.", "Medbring lommeregner kl. 8.15 til prøven.", "Tag tre
blade med i en pose.", "Husk to poser." - but not homework or plans: "Husk at læse 20 min hver
dag.", "Vi tager med bussen." Nothing else is read into the notes. While the timetable is
hidden, Husk also names the day's subjects: "Fag: Dansk, Matematik, Engelsk, Musik".

### Subject names

Aula's timetable often has abbreviations where the week plan has names. The cards write the
common ones out - `DAN` Dansk, `MAT` Matematik, `IDR` Idræt, `N/T` Natur/teknologi, `UUV`
Understøttende undervisning, and more - and compare subjects by them. Correct or add names, or
keep an abbreviation as it is by naming it itself:

```yaml
subject_names:
  - aula: UUV
    name: Bevægelse
  - aula: KRI
    name: KRI
```

## Several children

**One card with several children** answers each question for all of them at once: one header
when they have the same day, a column of hours and things of each child's own under it, and in
every block a part for each child, named with the child's initial and name, in the same order and
the same column all the way down. From about 600 px (700 px on a wall) two children stand side by
side, from about 900 px (1100 px) three; more fill two rows.

**One card per child** shows them one after another: put a card for each child, each with its
own `children`.

## The wall screen

For a tablet on the wall, a sections view with three columns and the school day card spanning two
of them, `size: large`; the homework card beside it:

```yaml
type: sections
max_columns: 3
sections:
  - type: grid
    column_span: 2
    cards:
      - type: custom:aula-connect-day-card
        size: large
  - type: grid
    cards:
      - type: custom:aula-connect-homework-card
```

With `size: large` the header's title is 56 px, each child's hours 36 px and the things to bring
30 px, read from across a kitchen, and Husk comes first. The first screen of a 1280 × 800 tablet
holds the day, each child's hours and what each child is to bring.

## Changes from 0.0.2

Configurations of `custom:aula-connect-card` keep working as the week card. What changes:

- **The next school day takes over at noon** (`switch_time: "12:00"`); `"00:00"` keeps today all
  day, as before.
- **This week collapses** once the day that matters is next week; with `weeks: 1` the card shows
  that week, after this week collapsed.
- **The timetable is folded** to subjects and start times (`timetable: full` opens it), and **a
  note longer than six lines folds** (`info_lines: 0` shows every note whole).
- **`sections` is ignored**: homework is under Lektier and every other note under Dagens plan.
- Lesson counts, authors and the summaries' note counts per section are gone.

## The API it uses

- `aula_connect/children`, to list the children.
- `aula_connect/week/subscribe`, with a child's `entry_id` and `child_id` and the days from the
  Monday of this week to the Sunday of the next. The integration sends the range again whenever
  it can have changed; the cards move to a new day and week by their own clock.

## Privacy

The cards only show. They never change anything in Aula, mark nothing as read and have nothing
to tap but what opens and closes. They read what Aula Connect has already fetched, through Home
Assistant's own connection, and send nothing anywhere else.

## Development

Node 22: `npm ci`, then `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`,
which writes `dist/aula-connect-card.js` and fails above the bundle's budget. `CARD_VERSION` sets
the version the build embeds. The screenshots come from `node scripts/screenshot.ts` after a
build (Playwright with Chromium, installed outside the repository); `--set docs` writes these.

## License

MIT.
