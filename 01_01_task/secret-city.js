// Secret task: find city anomalies in people.csv.
// Outputs a city frequency table to output/secret-city.csv.
// Run: node secret-city.js

import { loadCSV, serializeCSV } from "./src/utils/csv.js";
import { writeFile } from "node:fs/promises";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { paths } from "./src/config.js";

const OUTPUT = path.join(path.dirname(paths.final), "secret-city.csv");

async function main() {
  const people = loadCSV(paths.input);
  console.log(`Loaded ${people.length} people from people.csv\n`);

  // Count how many people come from each city
  const counts = {};
  for (const p of people) {
    counts[p.birthPlace] = (counts[p.birthPlace] ?? 0) + 1;
  }

  // Sort alphabetically by city name
  const rows = Object.keys(counts)
    .sort((a, b) => a.localeCompare(b, "pl"))
    .map(city => ({ city, count: counts[city] }));

  // Find cities with only 1 person
  const uniqueCities = rows.filter(r => r.count === 1);

  if (uniqueCities.length === 0) {
    console.log("No city belongs to only 1 person.");
  } else if (uniqueCities.length === 1) {
    console.log(`1 city belongs to only 1 person: ${uniqueCities[0].city}`);
  } else {
    console.log(`${uniqueCities.length} cities belong to only 1 person:`);
    for (const r of uniqueCities) console.log(`  ${r.city}`);
  }

  const dir = path.dirname(OUTPUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  await writeFile(OUTPUT, serializeCSV(rows));
  console.log(`\nSaved to: ${OUTPUT}`);
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
