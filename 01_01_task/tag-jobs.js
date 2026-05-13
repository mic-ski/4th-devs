// Stage 2: tag every job description in filtered.csv using the LLM.
// Run: node tag-jobs.js
// Requires: output/filtered.csv (produced by filter.js)
// Output: output/tagged.json

import { loadCSV } from "./src/utils/csv.js";
import { tagPeople } from "./src/pipeline/tagPeople.js";
import { paths } from "./src/config.js";

async function main() {
  const people = loadCSV(paths.filtered);
  if (people.length === 0) {
    console.error("Error: output/filtered.csv is empty. Run filter.js first.");
    process.exit(1);
  }

  console.log(`Loaded ${people.length} people from filtered.csv\n`);

  await tagPeople(people);

  console.log(`\nDone! Tags saved to: ${paths.tagged}`);
  console.log("Now run: node final.js");
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
