// Stage 4: build the submission JSON and write it to output/send.txt.
// Run: node send.js
// Requires: output/final.csv (produced by final.js)

import { loadCSV } from "./src/utils/csv.js";
import { writeFile } from "node:fs/promises";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { paths } from "./src/config.js";

async function main() {
  const people = loadCSV(paths.final);
  if (people.length === 0) {
    console.error("Error: output/final.csv is empty. Run final.js first.");
    process.exit(1);
  }

  const answer = people.map(p => ({
    name:    p.name,
    surname: p.surname,
    gender:  p.gender,
    born:    parseInt(p.born, 10),
    city:    p.city,
    tags:    p.tags.split(";")
  }));

  const payload = {
    apikey: "tutaj-twój-klucz-api",
    task:   "people",
    answer
  };

  const output = JSON.stringify(payload, null, 2);

  const dir = path.dirname(paths.final);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const sendPath = path.join(dir, "send.txt");
  await writeFile(sendPath, output);

  console.log(`Written to: ${sendPath}`);
  console.log("Replace 'tutaj-twój-klucz-api' with your real key, then send.");
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
