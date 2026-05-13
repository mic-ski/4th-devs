// This module handles reading and writing the distances CSV file.
//
// The CSV is the "memory" that survives between each person's agent call.
// Because we clear the conversation context between persons, the CSV is
// the only place where results accumulate. After all persons are processed,
// Phase 2 reads this file to find the closest person overall.
//
// CSV format:
//   name,surname,born,city,<plant1>_km,...,<plantN>_km,closest_plant,closest_plant_code,closest_distance_km

import { appendFile, readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";

// __dirname equivalent for ES modules.
// import.meta.dirname gives us the directory of THIS file (src/).
// We go one level up (..) to reach the project root, then into output/.
const OUTPUT_DIR = resolve(import.meta.dirname, "..", "output");
export const CSV_PATH = resolve(OUTPUT_DIR, "distances.csv");

// initializeCsv() creates the output directory and writes the header row.
// It always overwrites the file — each script run starts fresh.
//
// Parameter:
//   powerPlants — array of { city, code, lat, lon } objects
//                 (we use the city names as column headers)
export const initializeCsv = async (powerPlants) => {
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Build a header column for each power plant, e.g. "Grudziądz_km"
  const plantColumns = powerPlants.map((p) => `${p.city}_km`).join(",");
  const header = `name,surname,born,city,${plantColumns},closest_plant,closest_plant_code,closest_distance_km\n`;

  await writeFile(CSV_PATH, header, "utf-8");
  console.log(`CSV initialised: ${CSV_PATH}`);
};

// appendPersonRow() adds one row to the CSV for a single person.
// "append" means we add to the end of the file without deleting what's there.
//
// Parameters:
//   name        — string
//   surname     — string
//   born        — number (birth year, e.g. 1987)
//   personCity  — string (the person's home city from people.json)
//   distances   — array of { city, code, min_distance_km } (may be in any order)
//   powerPlants — array of { city, code, lat, lon } in the original header order
//
// Why powerPlants is needed:
//   The header columns were written in the original findhim_locations.json order.
//   The distances array arriving from the agent may be sorted differently.
//   Without matching them by city name, values land under the wrong column headers.
export const appendPersonRow = async (name, surname, born, personCity, distances, powerPlants) => {
  // Find the closest plant by scanning all entries for the smallest distance.
  // We do NOT rely on distances[0] because the agent may reorder the array.
  const closest = distances.reduce((min, d) =>
    d.min_distance_km < min.min_distance_km ? d : min
  );

  // Write distance columns in the same order as the header (original plant order).
  // For each plant in the header, find its entry in distances by city name.
  const distColumns = powerPlants.map((plant) => {
    const match = distances.find((d) => d.city === plant.city);
    return match ? match.min_distance_km.toFixed(3) : "N/A";
  }).join(",");

  const row = `${name},${surname},${born},${personCity},${distColumns},${closest.city},${closest.code},${closest.min_distance_km.toFixed(3)}\n`;

  await appendFile(CSV_PATH, row, "utf-8");
};

// findClosestPerson() reads the CSV and returns the row where
// closest_distance_km is the smallest across all persons.
// This is the suspect we care about — they were nearest to a power plant.
//
// Returns: object with CSV column names as keys, e.g.:
//   { name: "Jacek", surname: "Nowak", born: "1991", closest_plant_code: "PWR7264PL", ... }
export const findClosestPerson = async () => {
  if (!existsSync(CSV_PATH)) {
    throw new Error("distances.csv not found — did Phase 1 complete successfully?");
  }

  const content = await readFile(CSV_PATH, "utf-8");
  const lines = content.trim().split("\n");

  if (lines.length < 2) {
    throw new Error("distances.csv has no data rows");
  }

  // Parse header to get column names.
  const headers = lines[0].split(",");

  // Parse every data row into an object.
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i];
    });
    return row;
  });

  // Find the row with the smallest closest_distance_km value.
  let winner = null;
  let minDist = Infinity;

  for (const row of rows) {
    const dist = parseFloat(row.closest_distance_km);
    if (!isNaN(dist) && dist < minDist) {
      minDist = dist;
      winner = row;
    }
  }

  if (!winner) {
    throw new Error("Could not determine closest person — check distances.csv for missing data");
  }

  return winner;
};
