// Secret task: post secret-final.json to the hub.
// Run: node post-secret-final.js
// Requires: output/secret-final.json (produced by secret-final.js)

import path from "node:path";
import { readJsonIfExists } from "./src/utils/file.js";
import { paths, hubApiKey } from "./src/config.js";

const HUB_URL = "https://hub.ag3nts.org/verify";
const INPUT   = path.join(path.dirname(paths.final), "secret-final.json");

async function main() {
  if (!hubApiKey) {
    console.error("Error: HUB_API_KEY is not set in your .env file.");
    process.exit(1);
  }

  const answer = readJsonIfExists(INPUT);
  if (!answer) {
    console.error("Error: output/secret-final.json not found. Run secret-final.js first.");
    process.exit(1);
  }

  console.log(`Sending 1 person to ${HUB_URL}...`);
  console.log(`  ${answer[0].name} ${answer[0].surname} | tags: ${answer[0].tags.join(", ")}`);

  const payload = {
    apikey: hubApiKey,
    task:   "people",
    answer
  };

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
