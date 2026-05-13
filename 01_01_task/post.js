// Stage 5: post the final answer to the hub and print the response.
// Run: node post.js
// Requires: output/final.csv (produced by final.js)

import { loadCSV } from "./src/utils/csv.js";
import { paths, hubApiKey } from "./src/config.js";

const HUB_URL = "https://hub.ag3nts.org/verify";

async function main() {
  if (!hubApiKey) {
    console.error("Error: HUB_API_KEY is not set in your .env file.");
    process.exit(1);
  }

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
    apikey: hubApiKey,
    task:   "people",
    answer
  };

  console.log(`Sending ${answer.length} person(s) to ${HUB_URL}...`);

  const response = await fetch(HUB_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload)
  });

  const text = await response.text();
  console.log(`\nServer response (${response.status}):`);
  console.log(text);
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
