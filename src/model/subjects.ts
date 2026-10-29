/**
 * Subject names. Aula's lessons often carry an abbreviation ("IDR"), the week plan's notes a full
 * name ("Idræt"): one namer writes the abbreviations out, and both are matched by the key of
 * their names. Subject names are the school's and are never translated.
 *
 * @packageDocumentation
 */

/** A name given in the configuration to a lesson title as Aula has it. */
export interface SubjectName {
  /** The lesson's title in Aula, such as "UUV". */
  readonly aula: string;
  /** The name to show, such as "Bevægelse"; the title itself turns writing it out off. */
  readonly name: string;
}

/**
 * Danish school subjects and the abbreviations and other names Aula uses for them. Left out on
 * purpose: BI (Biologi or Billedkunst), SA, KL and SV, which are ambiguous or read as a teacher's
 * initials.
 */
export const DANISH_SUBJECTS: readonly (readonly [name: string, aliases: readonly string[]])[] = [
  ["Dansk", ["DAN", "DA", "DSK"]],
  ["Matematik", ["MAT", "MA"]],
  ["Engelsk", ["ENG", "EN"]],
  ["Tysk", ["TYS", "TY"]],
  ["Fransk", ["FRA", "FR"]],
  ["Spansk", ["SPA"]],
  ["Idræt", ["IDR", "ID"]],
  ["Svømning", ["SVØ"]],
  ["Natur/teknologi", ["N/T", "NT", "NAT", "Natur og teknologi"]],
  ["Historie", ["HIS", "HI"]],
  ["Kristendomskundskab", ["KRI", "KR", "Kristendom"]],
  ["Samfundsfag", ["SAM"]],
  ["Geografi", ["GEO", "GE"]],
  ["Biologi", ["BIO"]],
  ["Fysik/kemi", ["FYS", "FK", "Fysik-kemi"]],
  ["Musik", ["MUS", "MU"]],
  ["Billedkunst", ["BIL", "BK"]],
  ["Madkundskab", ["MAD", "MK", "Hjemkundskab"]],
  ["Håndværk og design", ["HÅN", "HD", "H&D", "HDÅ"]],
  ["Klassens tid", ["KLT", "KT", "KLA"]],
  ["Understøttende undervisning", ["UUV", "UU"]],
  ["Valgfag", ["VAL"]],
  ["Lektiecafé", ["LEK"]],
  ["Teknologiforståelse", ["TEK"]],
];

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
}

/** Returns a subject's label from the text Aula or the week plan has for it. */
export type SubjectNamer = (raw: string) => SubjectLabel;

const BUILT_IN = new Map<string, string>(
  DANISH_SUBJECTS.flatMap(([name, aliases]) =>
    [name, ...aliases].map((alias) => [subjectKey(alias), name] as const),
  ),
);

/**
 * Returns a namer: the configured names first, then the built-in Danish ones, else the text as
 * it is. Only whole titles are named.
 */
export function subjectNamer(overrides: readonly SubjectName[]): SubjectNamer {
  const configured = new Map(overrides.map((item) => [subjectKey(item.aula), item.name.trim()]));
  const named = new Map<string, SubjectLabel>();
  return (raw) => {
    let label = named.get(raw);
    if (!label) {
      const key = subjectKey(raw);
      const name = configured.get(key) ?? BUILT_IN.get(key) ?? raw.trim();
      label = { name, raw, key: subjectKey(name) };
      named.set(raw, label);
    }
    return label;
  };
}
