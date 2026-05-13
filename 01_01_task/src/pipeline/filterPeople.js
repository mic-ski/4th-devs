import { filter as cfg } from "../config.js";

function getBirthYear(birthDate) {
  return parseInt(birthDate.split("-")[0], 10);
}

/**
 * Attaches tags from tagged.json to each person, applies all filters,
 * and returns only the people who match every criterion.
 *
 * people: array of person objects from the CSV
 * tagged: object from tagged.json  { "0": { tags: [...], job: "..." }, ... }
 * returns: filtered array of person objects (with tags attached)
 */
export function filterPeople(people, tagged) {
  return people
    .map((person, i) => {
      const entry = tagged[String(i)];
      const activeTags = (entry?.tags ?? [])
        .filter(t => t.confidence >= cfg.confidenceThreshold)
        .map(t => t.tag);
      return { ...person, tags: activeTags };
    })
    .filter(p => {
      const birthYear = getBirthYear(p.birthDate);
      const age       = cfg.currentYear - birthYear;
      return (
        p.gender    === cfg.gender &&
        p.birthPlace === cfg.city  &&
        age >= cfg.minAge          &&
        age <= cfg.maxAge          &&
        p.tags.includes(cfg.tag)
      );
    });
}

/**
 * Formats the filtered people into the answer shape the hub expects.
 * returns: array of answer objects
 */
export function buildAnswer(matches) {
  return matches.map(p => ({
    name:    p.name,
    surname: p.surname,
    gender:  p.gender,
    born:    getBirthYear(p.birthDate),
    city:    p.birthPlace,
    tags:    p.tags
  }));
}
