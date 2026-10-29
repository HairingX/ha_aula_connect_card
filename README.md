# Aula Connect Card

A Home Assistant dashboard card with each child's week from
[Aula Connect](https://github.com/HairingX/ha_aula_connect): the timetable, homework and things
to remember from the school's week plan, other calendar events, and birthdays - for this week
and next, day by day, with today opened.

![The card on a phone, in a light theme](docs/screenshot.png)

| Dark theme                                            | Wall screen                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ![The card in a dark theme](docs/screenshot-dark.png) | ![The card on a wide screen, the two weeks side by side](docs/screenshot-wide-light.png) |

The screenshots show made-up data.

## What it shows

For each child, under the child's first name and school:

- **The days of this week and next**, today opened and marked, the days before it greyed. A
  closed day sums itself up: the school hours, the number of notes in each section, the events
  and the birthdays. On a wide screen the two weeks stand side by side.
- **The timetable**: each lesson's time, subject, teachers (by their initials) and room, with
  the lesson going on now marked, and cancelled lessons struck through and labelled.
- **Homework and things to remember** from the week plan, on the day they are for, sorted into
  sections - by default _Lektier_ (homework) and _Husk_ (remember) - each with its subject.
- **Events** and **birthdays**.

The card is in Danish when Home Assistant is, and in English otherwise, and follows the user's
time format, first weekday and time zone.

## Installation

You need [Aula Connect](https://github.com/HairingX/ha_aula_connect) set up, in the first
release after 0.0.3 or a later one: the card reads the websocket API it added.

Through HACS:

1. In HACS, open the menu, choose **Custom repositories**, and add
   `https://github.com/HairingX/ha_aula_connect_card` with the type **Dashboard**.
2. Find **Aula Connect Card** in HACS and download it. HACS adds the dashboard resource.
3. Reload the browser, edit a dashboard, add a card, and choose **Aula Connect**.

## Configuration

Everything can be set in the card's visual editor. In YAML:

```yaml
type: custom:aula-connect-card
children: [1001] # the child ids to show; every child when left out
weeks: 2 # 1 for this week, 2 for this and next week (the default)
show: # every part is shown unless switched off
  timetable: true
  tasks: true
  events: true
  birthdays: true
sections: # how the week plan's notes are sorted; these are the defaults
  - title: Lektier
    icon: mdi:book-open-variant
    type: task
  - title: Husk
    icon: mdi:bell-outline
    type: comment
```

| Option     | Default       | Meaning                                                      |
| ---------- | ------------- | ------------------------------------------------------------ |
| `children` | every child   | The children to show, by Aula's child id.                    |
| `weeks`    | `2`           | `1` shows this week, `2` this week and next.                 |
| `show`     | all `true`    | `timetable`, `tasks`, `events` and `birthdays`, each on/off. |
| `sections` | Lektier, Husk | The sections of the week plan's notes, in order.             |

A section has a `title`, an optional mdi `icon`, and rules: `type` (the note's type, such as
`task` for an assignment or `comment` for information), `subject` (the note's subject) and
`text` (a text the note's title contains). A note goes in the first section whose rules all
hold - a section without rules takes every note - and a note no section takes goes in _Andet_
(Other) at the end. The defaults follow Home Assistant's language.

## The API it uses

- `aula_connect/children`, to list the children.
- `aula_connect/week/subscribe`, with a child's `entry_id` and `child_id` and the days from the
  first of this week to the end of the last week shown. The integration sends the range again
  whenever it can have changed; the card moves to a new day and week by itself.

## Privacy

The card only shows. It never changes anything in Aula and marks nothing as read. It reads
what Aula Connect has already fetched, through Home Assistant's own connection, and sends
nothing anywhere else.

## Development

Node 22: `npm ci`, then `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`,
which writes `dist/aula-connect-card.js`. `CARD_VERSION` sets the version the build embeds.

## License

MIT.
