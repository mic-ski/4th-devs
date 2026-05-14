/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: src/ai.js — AI provider client (thin Responses API wrapper)
 * ═══════════════════════════════════════════════════════════════════
 *
 * This file has one job: send a completion request to an AI model
 * and return the text response. It wraps the Responses API (used by
 * OpenAI and OpenRouter) and normalises two different shapes the API
 * can return text in.
 *
 * It is called by sampling.js when the MCP client needs to fulfil a
 * sampling request from the server.
 * ═══════════════════════════════════════════════════════════════════
 */

import {
  AI_API_KEY,
  EXTRA_API_HEADERS,
  RESPONSES_API_ENDPOINT
} from "../../config.js";
// Destructuring import — pulls three named constants out of config.js.
// These are environment-variable-backed values: the API key, any extra headers
// (e.g. for OpenRouter routing), and the endpoint URL string.
// `../../config.js` goes up two directories (out of src/, out of 01_03_mcp_core/) to the root config.

// The Responses API can return text in two places:
//   1. data.output_text (direct shorthand)
//   2. data.output[].content[].text (nested message format)
const extractText = (data) => {
// Arrow function assigned to `const` — private to this file (not exported).
// `data` is the raw JSON object returned by the API (type: object).
// Returns a string — the extracted text — or an empty string if nothing is found.

  if (typeof data?.output_text === "string") {
    return data.output_text.trim();
  }
  // `typeof` is a JS operator that returns the type of a value as a string.
  // `data?.output_text` uses optional chaining — safely reads `output_text` even if `data` is null.
  // `=== "string"` checks the type is exactly string (not a number, object, etc.).
  // If the API responded with the shorthand format, the text is right here — trim whitespace and return.

  const message = data?.output?.find((o) => o?.type === "message");
  // `.find()` iterates the array and returns the first element where the callback returns true.
  // `(o) => o?.type === "message"` — the test: find the first item whose `type` is "message".
  // `message` is either an object (the found element) or `undefined` if nothing matched.

  const part = message?.content?.find((c) => c?.type === "output_text");
  // Same pattern, now searching inside the found message's `content` array.
  // Optional chaining `message?.content` prevents a crash if `message` was undefined above.
  // `part` is an object or `undefined`.

  return part?.text?.trim() ?? "";
  // `part?.text` safely reads `.text` even if `part` is undefined.
  // `.trim()` removes leading/trailing whitespace.
  // `?? ""` is the nullish coalescing fallback — returns empty string if the whole chain is null/undefined.
  // This means the function always returns a string, never null or undefined.
};

export const completion = async ({ model, input, max_output_tokens }) => {
// `export` makes this function importable by other files.
// `async` — this function returns a Promise, allowing `await` inside.
// The single parameter is destructured immediately: `{ model, input, max_output_tokens }` pulls
// three named properties from the options object the caller passes.
// model: string, input: array of message objects, max_output_tokens: number

  const response = await fetch(RESPONSES_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
      ...EXTRA_API_HEADERS
    },
    body: JSON.stringify({ model, input, max_output_tokens })
  });
  // `fetch()` is the built-in HTTP client in Node.js (18+) and browsers.
  // It returns a Promise that resolves to a Response object — `await` pauses until the round-trip completes.
  // `Authorization: \`Bearer ${AI_API_KEY}\`` — standard API key header, assembled with a template literal.
  // `...EXTRA_API_HEADERS` is the spread operator: copies all key/value pairs from that object
  //   into the headers object inline. If EXTRA_API_HEADERS is `{}`, nothing is added.
  // `JSON.stringify({ model, input, max_output_tokens })` converts the options to a JSON string.
  //   `{ model, input, max_output_tokens }` uses property shorthand — same as `{ model: model, ... }`.
  // `response` is a Response object (type: Response), not the parsed data yet.

  const data = await response.json();
  // `response.json()` is also async — reads and parses the response body.
  // `await` pauses until the body is fully received and parsed.
  // `data` is the parsed JavaScript object (type: object).

  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `API request failed (${response.status})`);
  }
  // `response.ok` is true if the HTTP status was 2xx. `!response.ok` means a 4xx/5xx error.
  // `data.error` catches API-level errors that still come back with a 200 status.
  // `throw new Error(...)` creates and throws an Error object — caught by the caller's try/catch.
  // `data?.error?.message || \`API request failed (${response.status})\`` — uses `||` for fallback:
  //   use the API's own error message if present, otherwise build one from the HTTP status code.

  const text = extractText(data);
  if (!text) throw new Error("Empty response");
  // Calls the private helper to pull text out of whichever response format was returned.
  // If text is empty (falsy), throw — an empty completion is an unexpected failure.

  return text;
  // Returns the final text string.
  // Because this is `async`, the return is automatically wrapped in a resolved Promise.
};
