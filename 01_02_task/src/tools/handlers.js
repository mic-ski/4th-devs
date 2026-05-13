// Handlers are the actual JavaScript functions that run when the AI calls a tool.
//
// The AI can only "decide" what to call — it cannot run code itself.
// When it says "call get_person_locations with name=Jacek, surname=Nowak",
// our executor.js picks it up and calls the matching function here.
//
// We export createHandlers() instead of a plain object because some handlers
// need the power plant coordinates (which are geocoded at startup and passed in).
// This is called a "factory function" — a function that creates and returns another object.
//
// Python analogy: it is like a class __init__ that stores state (powerPlants)
// which the methods (handlers) can then access.

import { hubApiKey, hubBaseUrl } from "../config.js";
import { haversineDistance } from "../haversine.js";
import { appendPersonRow } from "../csv.js";
import { sendAnswer } from "./send.js";

// hubPost() is a private helper (not exported) used only inside this module.
// It sends a POST request to a Hub endpoint and returns parsed JSON.
const hubPost = async (endpoint, body) => {
  const response = await fetch(`${hubBaseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message ?? data?.error ?? `Hub ${endpoint} failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
};

// createHandlers() receives the pre-geocoded power plant data and returns
// an object whose keys are tool names and values are async handler functions.
//
// Parameter:
//   powerPlants — array of { city: string, code: string, lat: number, lon: number }
//                 (produced by geocoder.js at startup)
//
// Returns: object (all 5 handlers)
export const createHandlers = (powerPlants) => ({

  // ---------------------------------------------------------------------------
  // Handler 1: get_person_locations
  // Calls POST /api/location → returns list of coordinates
  // ---------------------------------------------------------------------------
  async get_person_locations({ name, surname }) {
    const data = await hubPost("/api/location", {
      apikey: hubApiKey,
      name,
      surname
    });

    // The API may return a plain array OR an object with a locations/data key.
    // We handle all common shapes here.
    let locations;
    if (Array.isArray(data)) {
      locations = data;
    } else if (Array.isArray(data?.locations)) {
      locations = data.locations;
    } else if (Array.isArray(data?.data)) {
      locations = data.data;
    } else {
      // Fallback: if we still don't know the shape, return whatever we got
      // so the AI can try to interpret it.
      return data;
    }

    return { locations };
  },

  // ---------------------------------------------------------------------------
  // Handler 2: calculate_min_distances
  // Pure maths — no network call. Uses pre-loaded power plant coordinates.
  // ---------------------------------------------------------------------------
  async calculate_min_distances({ locations }) {
    if (!locations || locations.length === 0) {
      return { distances: [] };
    }

    const distances = powerPlants.map((plant) => {
      // For each power plant, find the closest sighting among ALL the person's locations.
      // Math.min(...array) returns the smallest value in the array.
      const minDist = Math.min(
        ...locations.map((loc) => haversineDistance(loc.lat, loc.lon, plant.lat, plant.lon))
      );

      return {
        city: plant.city,
        code: plant.code,
        // Round to 3 decimal places to keep numbers clean in the CSV and prompts.
        min_distance_km: Math.round(minDist * 1000) / 1000
      };
    });

    // Sort ascending: closest power plant first, furthest last.
    distances.sort((a, b) => a.min_distance_km - b.min_distance_km);

    return { distances };
  },

  // ---------------------------------------------------------------------------
  // Handler 3: save_person_distances
  // Appends one row to the CSV file.
  // ---------------------------------------------------------------------------
  async save_person_distances({ name, surname, born, personCity, distances }) {
    // Pass powerPlants so appendPersonRow can write columns in the correct order.
    await appendPersonRow(name, surname, born, personCity, distances, powerPlants);
    return {
      success: true,
      message: `Saved distances for ${name} ${surname} to CSV`
    };
  },

  // ---------------------------------------------------------------------------
  // Handler 4: get_access_level
  // Calls POST /api/accesslevel → returns access level number
  // ---------------------------------------------------------------------------
  async get_access_level({ name, surname, birthYear }) {
    const data = await hubPost("/api/accesslevel", {
      apikey: hubApiKey,
      name,
      surname,
      birthYear
    });

    return data;
  },

  // ---------------------------------------------------------------------------
  // Handler 5: send_answer
  // Saves send.json, calls POST /verify → returns server response (flag!)
  // ---------------------------------------------------------------------------
  async send_answer({ name, surname, accessLevel, powerPlant }) {
    return sendAnswer({
      task: "findhim",
      answer: { name, surname, accessLevel, powerPlant }
    });
  }
});
