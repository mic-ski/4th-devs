// Tool definitions are JSON Schema objects that describe our tools to the AI model.
// The AI reads these descriptions and decides which tool to call and with what arguments.
//
// Each tool definition has:
//   type        — always "function" for function-calling tools
//   name        — unique identifier (must match the handler key exactly)
//   description — plain-English explanation that helps the AI understand WHEN to use it
//   parameters  — JSON Schema describing the input the tool accepts
//   strict      — true means the AI must follow the schema exactly (no extra fields)
//
// We split tools into two groups:
//   phase1Tools — used during data collection (one call per suspect)
//   phase3Tools — used during final submission
//
// This prevents the Phase 1 agent from accidentally calling send_answer,
// and keeps the Phase 3 agent focused on just two tasks.

export const phase1Tools = [
  // -------------------------------------------------------------------------
  // Tool 1: Fetch all known locations for a person from the Hub API
  // -------------------------------------------------------------------------
  {
    type: "function",
    name: "get_person_locations",
    description:
      "Fetches all GPS coordinates (latitude/longitude pairs) where a person has been spotted. " +
      "Returns an array of location objects. Call this first for each suspect.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The person's first name, e.g. 'Jacek'"
        },
        surname: {
          type: "string",
          description: "The person's surname (family name), e.g. 'Nowak'"
        }
      },
      required: ["name", "surname"],
      additionalProperties: false
    },
    strict: true
  },

  // -------------------------------------------------------------------------
  // Tool 2: Calculate minimum distance from person's locations to each plant
  // -------------------------------------------------------------------------
  {
    type: "function",
    name: "calculate_min_distances",
    description:
      "Given a list of coordinates where a person was spotted, calculates the minimum distance " +
      "(in kilometres) from any of those coordinates to each nuclear power plant. " +
      "Returns an array sorted from closest to furthest power plant. " +
      "Call this after get_person_locations, passing all locations you received.",
    parameters: {
      type: "object",
      properties: {
        locations: {
          type: "array",
          description: "All coordinates where the person was spotted. Pass the full list from get_person_locations.",
          items: {
            type: "object",
            description: "A single GPS coordinate",
            properties: {
              lat: {
                type: "number",
                description: "Latitude in decimal degrees"
              },
              lon: {
                type: "number",
                description: "Longitude in decimal degrees"
              }
            },
            required: ["lat", "lon"],
            additionalProperties: false
          }
        }
      },
      required: ["locations"],
      additionalProperties: false
    },
    strict: true
  },

  // -------------------------------------------------------------------------
  // Tool 3: Save one person's results to the CSV file
  // -------------------------------------------------------------------------
  {
    type: "function",
    name: "save_person_distances",
    description:
      "Saves one suspect's distance results to the CSV file. " +
      "Call this after calculate_min_distances, passing the distances array you received.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The person's first name"
        },
        surname: {
          type: "string",
          description: "The person's surname"
        },
        born: {
          type: "number",
          description: "Birth year as an integer, e.g. 1991"
        },
        personCity: {
          type: "string",
          description: "The person's home city from the suspects list"
        },
        distances: {
          type: "array",
          description: "The sorted distances array from calculate_min_distances",
          items: {
            type: "object",
            properties: {
              city: {
                type: "string",
                description: "Name of the power plant city"
              },
              code: {
                type: "string",
                description: "Power plant identifier code, e.g. PWR7264PL"
              },
              min_distance_km: {
                type: "number",
                description: "Minimum distance in kilometres"
              }
            },
            required: ["city", "code", "min_distance_km"],
            additionalProperties: false
          }
        }
      },
      required: ["name", "surname", "born", "personCity", "distances"],
      additionalProperties: false
    },
    strict: true
  }
];

export const phase3Tools = [
  // -------------------------------------------------------------------------
  // Tool 4: Get a person's security access level
  // -------------------------------------------------------------------------
  {
    type: "function",
    name: "get_access_level",
    description:
      "Fetches the security access level for a person from the Hub API. " +
      "Returns a number indicating their clearance level.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The person's first name"
        },
        surname: {
          type: "string",
          description: "The person's surname"
        },
        birthYear: {
          type: "number",
          description: "Birth year as an integer, e.g. 1991"
        }
      },
      required: ["name", "surname", "birthYear"],
      additionalProperties: false
    },
    strict: true
  },

  // -------------------------------------------------------------------------
  // Tool 5: Submit the final answer to the Hub and collect the flag
  // -------------------------------------------------------------------------
  {
    type: "function",
    name: "send_answer",
    description:
      "Submits the final answer to the Hub's /verify endpoint. " +
      "Call this only after you have retrieved the access level. " +
      "Saves the payload to output/send.json and returns the server's response.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The suspect's first name"
        },
        surname: {
          type: "string",
          description: "The suspect's surname"
        },
        accessLevel: {
          type: "number",
          description: "The access level number returned by get_access_level"
        },
        powerPlant: {
          type: "string",
          description: "The power plant code, e.g. PWR7264PL"
        }
      },
      required: ["name", "surname", "accessLevel", "powerPlant"],
      additionalProperties: false
    },
    strict: true
  }
];
