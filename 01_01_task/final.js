// Stage 3: select transport-tagged people and write final.csv.
// Run: node final.js
// Requires: output/filtered.csv and output/tagged.json (from tag-jobs.js)

import { loadCSV, serializeCSV } from "./src/utils/csv.js";
import { readJsonIfExists } from "./src/utils/file.js";
import { writeFile } from "node:fs/promises";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { paths, filter } from "./src/config.js";

async function main() {
  const people = loadCSV(paths.filtered);
  if (people.length === 0) {
    console.error("Error: output/filtered.csv is empty. Run filter.js first.");
    process.exit(1);
  }

  const tagged = readJsonIfExists(paths.tagged);
  if (!tagged) {
    console.error("Error: output/tagged.json not found. Run tag-jobs.js first.");
    process.exit(1);
  }

  console.log(`Loaded ${people.length} people from filtered.csv`);
  console.log(`Confidence threshold: ${filter.confidenceThreshold}%`);

  const matches = people
    .map((p, i) => {
      const entry = tagged[String(i)];
      const activeTags = (entry?.tags ?? [])
        .filter(t => t.confidence >= filter.confidenceThreshold)
        .map(t => t.tag);
      return { ...p, tags: activeTags };
    })
    .filter(p => p.tags.includes(filter.tag));

  console.log(`\nFound ${matches.length} person(s) with tag "${filter.tag}":\n`);

  for (const p of matches) {
    const born = parseInt(p.birthDate.split("-")[0], 10);
    console.log(`  ${p.name} ${p.surname} | born ${born} | tags: ${p.tags.join(", ")}`);
  }

  if (matches.length === 0) {
    console.log("\nNo matches. Try lowering confidenceThreshold in src/config.js.");
    return;
  }

  // Build CSV rows matching the submission spec fields:
  // name, surname, gender, born (year only), city, tags (semicolon-separated)
  const rows = matches.map(p => ({
    name:    p.name,
    surname: p.surname,
    gender:  p.gender,
    born:    parseInt(p.birthDate.split("-")[0], 10),
    city:    p.birthPlace,
    tags:    p.tags.join(";")
  }));

  const dir = path.dirname(paths.final);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  await writeFile(paths.final, serializeCSV(rows));
  console.log(`\nSaved to: ${paths.final}`);
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
