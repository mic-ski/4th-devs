/**
 * AI provider client — calls the Responses API (OpenAI / OpenRouter).
 *
 * Handles the request/response cycle and text extraction.
 * Provider/key selection is handled by the root config.js.
 */
// This file is the only place in the project that actually talks to the LLM API.
// Everything else (agent.js, tools) calls chat() from here without knowing
// which provider or endpoint is being used.

import {
  AI_API_KEY,
  EXTRA_API_HEADERS,
  RESPONSES_API_ENDPOINT
} from "../../config.js";
// Named imports from a config file two levels up.
// The {} syntax imports specific exported values by name — not the whole file.
// "../../" means: go up two directories from the current file's location.

// The Responses API returns text in two possible locations
const extractResponseText = (data) => {
// Private helper — no export keyword, so only usable within this file.
// The API can return the final text in two different shapes depending on the provider,
// so this function handles both cases.

  if (typeof data?.output_text === "string") {
    return data.output_text.trim();
  }
  // First shape: data.output_text is directly a string.
  // data?.output_text uses optional chaining — if data is null/undefined,
  // this returns undefined instead of throwing. typeof undefined is "undefined", not "string",
  // so the if block is safely skipped.
  // .trim() removes leading/trailing whitespace from the string.

  const message = data?.output?.find((o) => o?.type === "message");
  const part = message?.content?.find((c) => c?.type === "output_text");
  return part?.text?.trim() ?? "";
  // Second shape: data.output is an array of items, one of which has type "message",
  // and inside that message, content is another array with an "output_text" item.
  // .find() returns the first matching item or undefined.
  // Each step uses ?. so if any level is missing, the whole chain returns undefined
  // rather than throwing "Cannot read properties of undefined".
  // ?? "" means: if part?.text?.trim() is null or undefined, return empty string instead.
};

/**
 * Sends a chat request to the Responses API.
 * Returns the raw response (caller extracts tool calls or text).
 */
export const chat = async ({ model, input, tools, toolChoice = "auto", instructions }) => {
// Destructured parameters — the caller passes one config object and we unpack it here.
// toolChoice = "auto" is a default parameter value: if the caller doesn't pass toolChoice,
// it defaults to "auto". Same concept as Python's def f(x="auto").

  const body = { model, input };
  // Start building the request body with the two required fields.
  // { model, input } is shorthand for { model: model, input: input }.

  if (tools?.length) { body.tools = tools; body.tool_choice = toolChoice; }
  if (instructions) body.instructions = instructions;
  // Conditionally add optional fields — only include them in the request if they were provided.
  // tools?.length uses optional chaining: if tools is undefined, ?.length returns undefined
  // (falsy) instead of throwing. An empty array has length 0 which is also falsy, so
  // we correctly skip adding tools: [] to the body.
  // Multiple statements on one line separated by ; — uncommon style but valid JS.

  const response = await fetch(RESPONSES_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
      ...EXTRA_API_HEADERS
    },
    body: JSON.stringify(body)
  });
  // fetch() is the built-in browser/Node.js function for making HTTP requests.
  // It takes a URL and an options object. await pauses until the HTTP response headers arrive
  // (not the full body yet — that's the next await).
  // Authorization: `Bearer ${AI_API_KEY}` is how API key auth works — the key goes in
  // the Authorization header with the word "Bearer" in front.
  // ...EXTRA_API_HEADERS spreads any additional headers from config into this object,
  // e.g. for OpenRouter which requires extra headers beyond the standard ones.
  // JSON.stringify(body) converts the JS object to a JSON string for the request body.

  const data = await response.json();
  // response.json() reads the response body and parses it as JSON — also async,
  // so we await it. Returns a plain JS object.

  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `API request failed (${response.status})`);
  }
  // response.ok is true for 2xx status codes, false for 4xx/5xx.
  // data.error means the API returned a 200 but included an error field in the JSON body
  // (some APIs do this instead of using HTTP error codes).
  // || means: use the left side if truthy, otherwise the right side (the fallback message).
  // response.status is the HTTP status code number, e.g. 401, 429, 500.

  return data;
  // Return the full raw response object — agent.js will call extractToolCalls()
  // or extractText() on it to get what it needs.
};

export const extractToolCalls = (response) =>
  (response.output ?? []).filter((item) => item.type === "function_call");
// Pulls all tool call items out of the response's output array.
// response.output ?? [] means: if output is null/undefined use an empty array,
// so .filter() never throws on a missing field.
// .filter() returns a new array containing only items where the condition is true.
// The result is an array of tool call objects (possibly empty).

export const extractText = (response) =>
  extractResponseText(response) || null;
// Calls the private helper and converts an empty string "" to null.
// "" is falsy in JS, so "" || null returns null.
// This lets callers check `if (text)` or use `?? "No response"` cleanly.
