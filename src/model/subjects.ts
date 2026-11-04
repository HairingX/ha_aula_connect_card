/**
 * Subject names. Aula's lessons often carry an abbreviation ("IDR"), the week plan's notes a full
 * name ("Idræt"): one namer writes the abbreviations out, and both are matched by the key of
 * their names. Subject names are the school's and are never translated.
 *
 * @packageDocumentation
 */

/** How a lesson at the time of another goes into it: where they overlap, at the same time, or never. */
export type MergeMode = "overlap" | "equal" | "never";

/** What the configuration gives a lesson title as Aula has it: a name, a colour, how it merges. */
export interface SubjectName {
  /** The lesson's title in Aula, such as "UUV". */
  readonly aula: string;
  /** The name to show, such as "Bevægelse"; the title itself turns writing it out off. */
  readonly name?: string | undefined;
  /** The subject's colour, as "#rrggbb", for every title of the subject. */
  readonly color?: string | undefined;
  /** How the subject's lessons go into another lesson at their time. */
  readonly merge?: MergeMode | undefined;
}

/**
 * Danish school subjects, each with the abbreviations and other names Aula uses for it: a name
 * and its aliases split by ",", the subjects by ";". Left out on purpose: BI (Biologi or
 * Billedkunst), SA, KL and SV, which are ambiguous or read as a teacher's initials.
 */
export const DANISH_SUBJECTS =
  "Dansk,DAN,DA,DSK;Matematik,MAT,MA;Engelsk,ENG,EN;Tysk,TYS,TY;Fransk,FRA,FR;Spansk,SPA;Idræt,IDR,ID;Svømning,SVØ;Natur/teknologi,N/T,NT,NAT,Natur og teknologi;Historie,HIS,HI;Kristendomskundskab,KRI,KR,Kristendom;Samfundsfag,SAM;Geografi,GEO,GE;Biologi,BIO;Fysik/kemi,FYS,FK,Fysik-kemi;Musik,MUS,MU;Billedkunst,BIL,BK;Madkundskab,MAD,MK,Hjemkundskab;Håndværk og design,HÅN,HD,H&D,HDÅ;Klassens tid,KLT,KT,KLA;Understøttende undervisning,UUV,UU;Valgfag,VAL;Børnehaveklasse,BHK;Lektiecafé,LEK;Teknologiforståelse,TEK;2 lærere,2Lær";

// A class marker standing alone at the start or end of a title: "3.B", "3b", "0A", "(6.A)".
const CLASS_MARKER = /^\(?\d{1,2}\.?\s?[a-zæøå]\)?\s+|\s+\(?\d{1,2}\.?\s?[a-zæøå]\)?$/iu;

/**
 * Returns the key subjects are compared by: without a class marker standing alone at the start
 * or end, in lower case, "&" as "og", and without spaces, dots, slashes and hyphens. "N/T" gives
 * "nt", "3.B IDR" gives "idr", "Håndværk & design" gives "håndværkogdesign".
 */
export function subjectKey(text: string): string {
  return text
    .trim()
    .replace(CLASS_MARKER, "")
    .toLocaleLowerCase("da")
    .replace(/&/g, "og")
    .replace(/[\s./-]/g, "");
}

/** A subject as shown, and the key it is matched by. */
export interface SubjectLabel {
  /** The name to show. */
  readonly name: string;
  /** The text as Aula or the week plan has it. */
  readonly raw: string;
  /** The key of `name`: the same for every name of one subject. */
  readonly key: string;
  /** A short name, where the name has no room: Aula's own abbreviation or the built-in one. */
  readonly short: string;
  /** The colour configured for the subject, as "#rrggbb". */
  readonly color: string | undefined;
  /** How its lessons go into another lesson at their time: a second teacher's where they overlap. */
  readonly merge: MergeMode;
}

/** Returns a subject's label from the text Aula or the week plan has for it. */
export type SubjectNamer = (raw: string) => SubjectLabel;

const ROWS = DANISH_SUBJECTS.split(";").map((row) => row.split(","));

const BUILT_IN = new Map<string, string>(
  ROWS.flatMap(([name = "", ...aliases]) =>
    [name, ...aliases].map((alias) => [subjectKey(alias), name] as const),
  ),
);

// A subject's first abbreviation, by the key of its name.
const ABBREVIATION = new Map<string, string>(
  ROWS.map(([name = "", first = name]) => [subjectKey(name), first] as const),
);

// A second teacher only ever joins another lesson, wherever the two overlap.
const SUPPORT = new Set([subjectKey("2 lærere")]);

/**
 * Returns a namer: the configured names first, then the built-in Danish ones unless `expand` is
 * false, else the text without a class marker standing alone at its start or end. Only whole
 * titles are named. A subject keeps the key of its built-in name either way, so that "IDR" and
 * "Idræt" are one subject whether written out or not.
 */
export function subjectNamer(overrides: readonly SubjectName[], expand = true): SubjectNamer {
  const configured = new Map(
    overrides.flatMap((item) => (item.name ? [[subjectKey(item.aula), item.name.trim()]] : [])),
  );
  // The class is the child's own, so its marker says nothing; Aula's title stays the tooltip.
  const known = (raw: string): string =>
    configured.get(subjectKey(raw)) ??
    BUILT_IN.get(subjectKey(raw)) ??
    raw.trim().replace(CLASS_MARKER, "");
  // A colour or a way to merge is the subject's, whichever of its titles it was given for.
  const bySubject = new Map(overrides.map((item) => [subjectKey(known(item.aula)), item]));
  const named = new Map<string, SubjectLabel>();
  return (raw) => {
    let label = named.get(raw);
    if (!label) {
      const own = configured.get(subjectKey(raw));
      const plain = raw.trim().replace(CLASS_MARKER, "");
      const full = known(raw);
      const key = subjectKey(full);
      const name = expand ? full : (own ?? plain);
      const given = bySubject.get(key);
      label = {
        name,
        raw,
        key,
        short:
          plain !== name && plain.length <= 4 ? plain : (ABBREVIATION.get(key) ?? name.slice(0, 3)),
        color: given?.color,
        merge: given?.merge ?? (SUPPORT.has(key) ? "overlap" : "equal"),
      };
      named.set(raw, label);
    }
    return label;
  };
}
