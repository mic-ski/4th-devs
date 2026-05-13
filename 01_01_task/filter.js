// Stage 1: filter people.csv by gender, birth city, and age.
// Run: node filter.js
// Output: output/filtered.csv

import { loadCSV, serializeCSV } from "./src/utils/csv.js";
import { writeFile } from "node:fs/promises";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { paths, filter } from "./src/config.js";

async function main() {
  const people = loadCSV(paths.input);
  console.log(`Loaded ${people.length} people from people.csv`);

  const filtered = people.filter(p => {
    const birthYear = parseInt(p.birthDate.split("-")[0], 10);
    const age = filter.currentYear - birthYear;
    return (
      p.gender     === filter.gender &&
      p.birthPlace === filter.city   &&
      age >= filter.minAge           &&
      age <= filter.maxAge
    );
  });

  console.log(`Kept ${filtered.length} people matching:`);
  console.log(`  gender: ${filter.gender}`);
  console.log(`  city:   ${filter.city}`);
  console.log(`  age:    ${filter.minAge}–${filter.maxAge} in ${filter.currentYear}`);

  const dir = path.dirname(paths.filtered);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  await writeFile(paths.filtered, serializeCSV(filtered));
  console.log(`\nSaved to: ${paths.filtered}`);
  console.log("Now run: node tag-jobs.js");
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
