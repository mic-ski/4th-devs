/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: src/elicitation.js — Auto-accept handler for MCP elicitation
 * ═══════════════════════════════════════════════════════════════════
 *
 * Elicitation is an MCP feature where the *server* asks the *client*
 * for structured user input — like a confirmation dialog or a settings
 * form. The server describes the form using JSON Schema; the client
 * fills it in and responds.
 *
 * In a real app, this would show a UI. In this demo it auto-fills by
 * inferring default values from the schema — no actual user needed.
 *
 * `createElicitationHandler` is a **factory function** — it returns a
 * handler function rather than being the handler itself. The factory
 * runs once at setup; the returned handler runs once per request.
 * ═══════════════════════════════════════════════════════════════════
 */

import { clientLog } from "./log.js";
// Imports the logging helper object from log.js — used to print elicitation events.

// Picks a reasonable default for a single schema property:
//   explicit default → boolean true → first enum value
const inferDefault = (prop) => {
// Arrow function assigned to `const` — private to this file (not exported).
// `prop` is a single JSON Schema property descriptor object (type: object).
// Returns the inferred default value for that property — type varies (boolean, string, etc.)

  if (prop?.default !== undefined) return prop.default;
  // `prop?.default` uses optional chaining — safely reads `.default` even if `prop` is null.
  // `!== undefined` (not `!= null`) — checks strictly for undefined so that `false` or `0`
  // are still treated as valid explicit defaults and returned as-is.

  if (prop?.type === "boolean") return true;
  // If no explicit default but the field is boolean, default to `true`.
  // Opinionated auto-accept choice: a boolean in a confirmation form almost always means "yes".

  if (prop?.enum?.length) return prop.enum[0];
  // `prop?.enum` — safe read in case this property has no enum.
  // `.length` is truthy if the array has at least one item.
  // If it's an enum field with options, pick the first one as the default.
};
// If none of the three conditions match, the function returns `undefined` implicitly.
// That `undefined` is used as a signal in `autoFillDefaults` below to skip the field.

// Walks the schema properties and builds a { key: value } map
// using inferred defaults, skipping any field without one.
const autoFillDefaults = (schema) =>
  Object.fromEntries(
    Object.entries(schema?.properties ?? {})
      .map(([key, prop]) => [key, inferDefault(prop)])
      .filter(([, v]) => v !== undefined)
  );
// Private arrow function — one-liner body, the expression is the implicit return value.
// `schema` is the JSON Schema object describing the form (type: object).
//
// Step by step:
//   `schema?.properties ?? {}` — safely reads the `properties` map, falling back to empty object.
//   `Object.entries(...)` — converts `{ key: value, ... }` into `[["key", value], ...]` (array of pairs).
//   `.map(([key, prop]) => [key, inferDefault(prop)])` — array destructuring in the parameter:
//     `[key, prop]` splits each pair; we keep `key` and replace `prop` with its inferred default.
//   `.filter(([, v]) => v !== undefined)` — removes pairs where the value is undefined (no default found).
//     `[, v]` destructures the pair but skips the first element (key) — the leading comma means "ignore this".
//   `Object.fromEntries(...)` — converts the array of pairs back into a plain object.
// Result: an object containing only the fields that have inferrable defaults.

/**
 * Creates an elicitation request handler for the MCP client.
 *
 * @param {object} options
 * @param {function} options.onElicitation — custom handler; if omitted, auto-accepts
 */
export const createElicitationHandler = (options = {}) => async (request) => {
// `export` makes this factory importable.
// This is a curried function — a function that returns another function.
//   Outer: `createElicitationHandler(options)` — called once at setup, returns the handler.
//   Inner: `async (request) => { ... }` — called by the MCP SDK per incoming request.
// `options = {}` defaults to empty object so destructuring inside won't crash if nothing is passed.

  clientLog.elicitationRequest(request.params);
  // Logs the incoming request. `request.params` holds the form description the server sent.

  // Only "form" mode is supported by the spec right now
  if (request.params.mode !== "form") {
    return { action: "decline" };
  }
  // The MCP spec defines a `mode` field. Currently only "form" is defined.
  // If a future mode arrives, decline it gracefully rather than crashing.
  // `{ action: "decline" }` tells the server this client refused the request.

  // Let the caller override with real UI if needed
  if (typeof options.onElicitation === "function") {
    return options.onElicitation(request.params);
  }
  // `typeof options.onElicitation === "function"` — safe check whether a real handler was injected.
  // If so, delegate entirely — return whatever the custom handler returns.
  // This is the hook for replacing auto-accept with actual UI in a production application.

  // Demo mode: auto-fill the form from schema defaults
  const content = autoFillDefaults(request.params.requestedSchema);
  clientLog.autoAcceptedElicitation(content);
  // Calls `autoFillDefaults` with the JSON Schema from the server's request.
  // `request.params.requestedSchema` is the schema object describing what the server wants filled.
  // `content` is the result — e.g. `{ confirm: true, style: "concise" }` (type: object).
  // Then logs what was auto-filled for debugging visibility.

  return { action: "accept", content };
  // Returns the acceptance response to the server.
  // `action: "accept"` signals the "user" confirmed.
  // `content` carries the filled-in form values.
  // `{ action: "accept", content }` uses property shorthand — same as `{ action: "accept", content: content }`.
};
