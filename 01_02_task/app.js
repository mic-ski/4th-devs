// ============================================================================
// app.js — Main entry point for the "findhim" agent
// ============================================================================
//
// This script runs in three phases:
//
//   Phase 1 — Data collection
//     For each suspect in people.json, an agent conversation is started.
//     The agent calls three tools: get_person_locations, calculate_min_distances,
//     save_person_distances. After each person, the conversation is discarded
//     and a fresh one starts for the next person.
//
//   Phase 2 — Analysis (pure JavaScript, no AI)
//     We read the distances.csv file and find the person with the smallest
//     distance to any power plant. This is deterministic maths, no AI needed.
//
//   Phase 3 — Submission
//     A new agent conversation is started. The agent calls get_access_level
//     and then send_answer. The server response (including the flag) is printed.
// ============================================================================

import { readFile } from "fs/promises";
import { resolve } from "path";
import readline from "readline";

import { processQuery } from "./src/executor.js";
import { api } from "./src/config.js";
import { geocodePowerPlants } from "./src/geocoder.js";
import { initializeCsv, findClosestPerson } from "./src/csv.js";
import { phase1Tools, phase3Tools, createHandlers } from "./src/tools/index.js";

// Paths to the input files you prepared.
const INPUT_DIR = resolve(import.meta.dirname, "input");
const PEOPLE_PATH = resolve(INPUT_DIR, "people.json");
const LOCATIONS_PATH = resolve(INPUT_DIR, "findhim_locations.json");

// ---------------------------------------------------------------------------
// askUser() — prints a question and waits for the user to type a response.
// Used before Phase 3 to confirm the answer before submitting.
//
// Parameter: question — string
// Returns:   Promise<string> — whatever the user typed, lowercased and trimmed
// ---------------------------------------------------------------------------
const askUser = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    // rl.question() prints the question and waits for one line of input.
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });

// ---------------------------------------------------------------------------
// printBanner() — visual separator to make the terminal output easier to read
// ---------------------------------------------------------------------------
const printBanner = (text) => {
  console.log(`\n${"─".repeat(60)}`);
  console.log(text);
  console.log("─".repeat(60));
};

// ---------------------------------------------------------------------------
// main() — runs all three phases in sequence
// ---------------------------------------------------------------------------
const main = async () => {
  // ── Load input files ──────────────────────────────────────────────────────

  const peopleData = JSON.parse(await readFile(PEOPLE_PATH, "utf-8"));
  const locationsData = JSON.parse(await readFile(LOCATIONS_PATH, "utf-8"));

  // The suspects are stored in the "answer" array inside people.json.
  // Each person has: name, surname, born (year), city, gender, tags.
  const people = peopleData.answer;

  console.log(`Loaded ${people.length} suspects from people.json`);
  console.log(`Loaded ${Object.keys(locationsData.power_plants).length} power plants from findhim_locations.json`);

  // ── Geocode power plants (one-time at startup) ────────────────────────────
  // This converts city names to lat/lon coordinates using Nominatim.
  // It takes ~8 seconds (1 second per city due to rate limiting).
  const powerPlants = await geocodePowerPlants(locationsData);

  // ── Set up tools and CSV ──────────────────────────────────────────────────
  // createHandlers() receives the geocoded power plants so the distance
  // calculator has access to them without needing to geocode again.
  const handlers = createHandlers(powerPlants);

  // Initialise (or reset) the CSV file with the correct header row.
  await initializeCsv(powerPlants);

  // ── PHASE 1: Process each suspect ────────────────────────────────────────
  printBanner("PHASE 1 — Collecting location data for each suspect");

  const phase1Config = {
    model: api.model,
    tools: phase1Tools,
    handlers,
    instructions: api.phase1Instructions
  };

  for (const person of people) {
    // Build a clear, specific prompt for this person.
    // Including home city helps if the API returns ambiguous data.
    const query =
      `Investigate suspect: ${person.name} ${person.surname} ` +
      `(born: ${person.born}, home city: ${person.city}). ` +
      `Get their locations, calculate distances to all power plants, and save to CSV.`;

    // processQuery() runs a full agent loop for this one person.
    // When it returns, the conversation is gone — the next iteration starts fresh.
    await processQuery(query, phase1Config);
  }

  // ── PHASE 2: Find the closest person (pure JavaScript) ───────────────────
  printBanner("PHASE 2 — Analysing results to find the closest suspect");

  const winner = await findClosestPerson();

  console.log(`\nResult:`);
  console.log(`  Name:           ${winner.name} ${winner.surname}`);
  console.log(`  Born:           ${winner.born}`);
  console.log(`  Home city:      ${winner.city}`);
  console.log(`  Closest plant:  ${winner.closest_plant} (${winner.closest_plant_code})`);
  console.log(`  Distance:       ${winner.closest_distance_km} km`);

  // ── Ask user before Phase 3 ───────────────────────────────────────────────
  console.log("");
  const confirm = await askUser(
    `\nReady to get access level and submit answer for ${winner.name} ${winner.surname}? (y/n): `
  );

  if (confirm !== "y") {
    console.log("\nAborted. The distances table is saved in output/distances.csv.");
    console.log("Run the script again and type 'y' when ready to submit.");
    process.exit(0);
  }

  // ── PHASE 3: Get access level and submit ─────────────────────────────────
  printBanner("PHASE 3 — Getting access level and submitting answer");

  const phase3Config = {
    model: api.model,
    tools: phase3Tools,
    handlers,
    instructions: api.phase3Instructions
  };

  // Pass everything the agent needs directly in the query.
  // The agent will call get_access_level, then send_answer, then report back.
  const submissionQuery =
    `The closest suspect to a nuclear power plant is: ` +
    `${winner.name} ${winner.surname}, born ${winner.born}. ` +
    `They were closest to the power plant in ${winner.closest_plant} ` +
    `with code ${winner.closest_plant_code} (distance: ${winner.closest_distance_km} km). ` +
    `Get their access level and submit the answer.`;

  await processQuery(submissionQuery, phase3Config);

  printBanner("Done! Check the output above for the server response and flag.");
};

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
