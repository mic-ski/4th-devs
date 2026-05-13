// Secret task: post the secret answer from input/secret.txt to the hub.
// Run: node post-secret.js

import { readFileSync } from "node:fs";
import path from "node:path";
import { paths, hubApiKey } from "./src/config.js";

const HUB_URL    = "https://hub.ag3nts.org/verify";
const SECRET_TXT = path.join(path.dirname(paths.input), "secret.txt");

async function main() {
  if (!hubApiKey) {
    console.error("Error: HUB_API_KEY is not set in your .env file.");
    process.exit(1);
  }

  const answer = readFileSync(SECRET_TXT, "utf8").trim();
  if (!answer) {
    console.error("Error: input/secret.txt is empty.");
    process.exit(1);
  }

  console.log(`Answer: "${answer}"`);
  console.log(`Sending to ${HUB_URL}...`);

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
