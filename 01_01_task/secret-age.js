// Secret task: find age anomalies in people.csv.
// Outputs the 5 youngest and 5 oldest people to output/secret-age.csv.
// Run: node secret-age.js

import { loadCSV, serializeCSV } from "./src/utils/csv.js";
import { writeFile } from "node:fs/promises";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { paths } from "./src/config.js";

const OUTPUT = path.join(path.dirname(paths.final), "secret-age.csv");
const TOP_N  = 5;

async function main() {
  const people = loadCSV(paths.input);
  console.log(`Loaded ${people.length} people from people.csv`);

  // Attach birth year as a number so we can sort
  const withAge = people.map(p => ({
    ...p,
    birthYear: parseInt(p.birthDate.split("-")[0], 10)
  }));

  // Sort oldest first (lowest birth year), then youngest first (highest birth year)
  const byAge = [...withAge].sort((a, b) => a.birthYear - b.birthYear);

  const oldest   = byAge.slice(0, TOP_N);
  const youngest = byAge.slice(-TOP_N).reverse();

  console.log(`\n5 oldest:`);
  for (const p of oldest)   console.log(`  ${p.name} ${p.surname} | born ${p.birthYear}`);

  console.log(`\n5 youngest:`);
  for (const p of youngest) console.log(`  ${p.name} ${p.surname} | born ${p.birthYear}`);

  // Tag each row so it's clear in the CSV which group they belong to
  const rows = [
    ...oldest.map(p   => ({ group: "oldest",   name: p.name, surname: p.surname, birthYear: p.birthYear, birthDate: p.birthDate, gender: p.gender, birthPlace: p.birthPlace, job: p.job })),
    ...youngest.map(p => ({ group: "youngest",  name: p.name, surname: p.surname, birthYear: p.birthYear, birthDate: p.birthDate, gender: p.gender, birthPlace: p.birthPlace, job: p.job }))
  ];

  const dir = path.dirname(OUTPUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  await writeFile(OUTPUT, serializeCSV(rows));
  console.log(`\nSaved to: ${OUTPUT}`);
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
