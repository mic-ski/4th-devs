// Secret task: find the person from Czerwony Las, tag their job with AI,
// and write the result to output/secret-final.json for review.
// Run: node secret-final.js

import path from "node:path";
import { loadCSV } from "./src/utils/csv.js";
import { chat } from "./src/api.js";
import { tagBatchSchema } from "./src/schemas/tagBatch.js";
import { buildTagPrompt } from "./src/prompts/tagBatch.js";
import { safeWriteJson } from "./src/utils/file.js";
import { paths, filter } from "./src/config.js";
import { resolveModelForProvider } from "../config.js";

const model = resolveModelForProvider("gpt-5.4");

const CITY          = "Czerwony Las";
const OUTPUT        = path.join(path.dirname(paths.final), "secret-final.json");
const OUTPUT_TAGGED = path.join(path.dirname(paths.final), "secret-final-tagged.json");

async function main() {
  const people = loadCSV(paths.input);
  console.log(`Loaded ${people.length} people from people.csv`);

  const person = people.find(p => p.birthPlace === CITY);
  if (!person) {
    console.error(`Error: no person found from "${CITY}".`);
    process.exit(1);
  }

  console.log(`\nFound: ${person.name} ${person.surname}`);
  console.log(`  born:  ${person.birthDate}`);
  console.log(`  job:   ${person.job}`);
  console.log(`\nTagging job with AI...`);

  // Tag this one person using the same batch infrastructure (batch of 1)
  const result = await chat({
    model,
    input: buildTagPrompt([{ index: 0, job: person.job }]),
    textFormat: tagBatchSchema
  });

  const allTags    = result.results[0]?.tags ?? [];
  const activeTags = allTags
    .filter(t => t.confidence >= filter.confidenceThreshold)
    .map(t => t.tag);

  // Show all scores in the terminal so you can see the confidence at a glance
  console.log(`  confidence scores (threshold: ${filter.confidenceThreshold}%):`);
  for (const t of allTags.sort((a, b) => b.confidence - a.confidence)) {
    const marker = t.confidence >= filter.confidenceThreshold ? "✓" : " ";
    console.log(`    ${marker} ${t.tag.padEnd(20)} ${t.confidence}%`);
  }

  // Save full scores to secret-final-tagged.json (same structure as tagged.json)
  await safeWriteJson(OUTPUT_TAGGED, {
    job: person.job,
    tags: allTags
  });
  console.log(`\nFull scores saved to: ${OUTPUT_TAGGED}`);

  const answer = [{
    name:    person.name,
    surname: person.surname,
    gender:  person.gender,
    born:    parseInt(person.birthDate.split("-")[0], 10),
    city:    person.birthPlace,
    tags:    activeTags
  }];

  await safeWriteJson(OUTPUT, answer);
  console.log(`\nSaved to: ${OUTPUT}`);
  console.log("Review the file, then run: node post-secret-final.js");
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
