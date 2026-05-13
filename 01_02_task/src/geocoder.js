// The geocoder converts city names (like "Grudziądz") into latitude/longitude
// coordinates that we can use with the Haversine formula.
//
// We use Nominatim — a free geocoding service built on OpenStreetMap data.
// No API key is needed, but the rules say: maximum 1 request per second,
// and you must include a User-Agent header identifying your app.
//
// CACHING: coordinates are saved to output/geocode_cache.json after the first
// lookup. On every subsequent run, each city is checked against the cache first.
// Only cities that are NOT in the cache trigger a real Nominatim request.
// This means the first run is slow (~8s), but all later runs are instant.
// To force a re-fetch for a city, just delete its entry from the cache file.

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OUTPUT_DIR = resolve(import.meta.dirname, "..", "output");
const CACHE_PATH = resolve(OUTPUT_DIR, "geocode_cache.json");

// sleep() pauses execution for a given number of milliseconds.
// We use this to respect Nominatim's rate limit (1 request/second).
//
// Parameter: ms — number (milliseconds to wait)
// Returns:   a Promise that resolves after the delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// loadCache() reads the cache file from disk and returns its contents.
// If the file doesn't exist yet, returns an empty object — same as an empty cache.
//
// Returns: Promise<object>  e.g. { "Grudziądz": { lat: 53.48, lon: 18.75 }, ... }
const loadCache = async () => {
  if (!existsSync(CACHE_PATH)) return {};
  const content = await readFile(CACHE_PATH, "utf-8");
  return JSON.parse(content);
};

// saveCache() writes the current cache object back to disk.
// Called every time a new city is added so the file is always up to date.
//
// Parameter: cache — object mapping city names to { lat, lon }
const saveCache = async (cache) => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
};

// geocodeCity() asks Nominatim for the lat/lon of one city in Poland.
//
// Parameter: city — string, e.g. "Grudziądz"
// Returns:   Promise<{ lat: number, lon: number }>
const geocodeCity = async (city) => {
  // URLSearchParams builds a query string like:
  // ?q=Grudziądz%2C+Poland&format=json&limit=1
  const params = new URLSearchParams({
    q: `${city}, Poland`,
    format: "json",
    limit: "1"
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      // Nominatim requires this header — it identifies who is making the request.
      "User-Agent": "findhim-agent/1.0 (educational security exercise)"
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed for "${city}": ${response.status}`);
  }

  // Nominatim returns an array of matching places. We asked for limit=1
  // so there will be at most one result.
  const results = await response.json();

  if (!results.length) {
    throw new Error(`Could not geocode city: "${city}"`);
  }

  // Nominatim returns lat/lon as strings — we convert them to numbers.
  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon)
  };
};

// geocodePowerPlants() processes the full findhim_locations.json object
// and returns an array of power plant objects enriched with coordinates.
// Checks the cache for each city before calling Nominatim.
//
// Parameter:
//   locations — the parsed JSON object from findhim_locations.json
//               { power_plants: { "Grudziądz": { code: "PWR7264PL", ... }, ... } }
//
// Returns: Promise<Array<{ city: string, code: string, lat: number, lon: number }>>
export const geocodePowerPlants = async (locations) => {
  const cities = Object.keys(locations.power_plants);

  // Load whatever coordinates we already saved from previous runs.
  const cache = await loadCache();

  const result = [];
  let fetchCount = 0;

  console.log(`\nResolving coordinates for ${cities.length} power plant cities...`);

  for (const city of cities) {
    if (cache[city]) {
      // Cache hit — no network request needed.
      const { lat, lon } = cache[city];
      console.log(`  ${city}: ${lat.toFixed(4)}, ${lon.toFixed(4)}  (cached)`);

      result.push({ city, code: locations.power_plants[city].code, lat, lon });
    } else {
      // Cache miss — fetch from Nominatim, then save to cache.
      process.stdout.write(`  ${city}: fetching... `);

      const { lat, lon } = await geocodeCity(city);
      console.log(`${lat.toFixed(4)}, ${lon.toFixed(4)}  (fetched)`);

      // Add to cache object and immediately persist it.
      // If the script crashes mid-loop, already-fetched cities are still saved.
      cache[city] = { lat, lon };
      await saveCache(cache);

      result.push({ city, code: locations.power_plants[city].code, lat, lon });
      fetchCount++;

      // Only wait if there are more cities to fetch after this one.
      // We check the remaining cities — not just "is this the last city overall"
      // because the next city might be a cache hit and needs no delay.
      const remainingCities = cities.slice(cities.indexOf(city) + 1);
      const nextNeedsFetch = remainingCities.some((c) => !cache[c]);
      if (nextNeedsFetch) {
        await sleep(1100);
      }
    }
  }

  if (fetchCount === 0) {
    console.log("All cities loaded from cache.\n");
  } else {
    console.log(`Fetched ${fetchCount} new cities, ${cities.length - fetchCount} from cache.\n`);
  }

  return result;
};
