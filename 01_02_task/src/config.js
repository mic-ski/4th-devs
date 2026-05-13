// This import triggers the root .env loader, which makes HUB_API_KEY available
// via process.env. It also gives us resolveModelForProvider() to pick the right
// model name depending on whether we are using OpenAI or OpenRouter.
import { resolveModelForProvider } from "../../config.js";

const HUB_API_KEY = process.env.HUB_API_KEY?.trim() ?? "";

if (!HUB_API_KEY) {
  console.error("Error: HUB_API_KEY is not set in the root .env file");
  process.exit(1);
}

export const hubApiKey = HUB_API_KEY;
export const hubBaseUrl = "https://hub.ag3nts.org";

export const api = {
  // gpt-4.1-mini is fast and cheap — good for structured tool-use tasks.
  // resolveModelForProvider adds the "openai/" prefix when using OpenRouter.
  model: resolveModelForProvider("gpt-4.1-mini"),

  // System prompt for Phase 1: one agent call per suspect.
  // The agent must call all three tools in order and then stop.
  phase1Instructions: `You are a location analysis agent for a security investigation.
You will be given one suspect to investigate.

You MUST follow these steps in order:
1. Call get_person_locations with the person's name and surname to get all coordinates where they were spotted.
2. Call calculate_min_distances with the full list of coordinates you received. This calculates how close the person came to each nuclear power plant.
3. Call save_person_distances with the person's details and the distances array you received.

After completing all three steps, write a short one-line summary of what you found.
If get_person_locations returns zero locations, skip steps 2 and 3 and say "No locations found for this person."`,

  // System prompt for Phase 3: get access level and submit.
  phase3Instructions: `You are a security report agent.
You will be given the name, surname, birth year, and power plant code of the closest suspect.

You MUST follow these steps in order:
1. Call get_access_level with the person's name, surname, and birthYear to find their security clearance.
2. Call send_answer with name, surname, the accessLevel you just received, and the powerPlant code.

After both steps, report what the server responded with.`
};
