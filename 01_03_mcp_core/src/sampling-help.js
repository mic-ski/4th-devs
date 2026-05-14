/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: src/sampling.js — Bridges MCP sampling requests to the AI provider
 * ═══════════════════════════════════════════════════════════════════
 *
 * Sampling is an MCP feature where the *server* asks the *client* to
 * call an LLM on its behalf. The server sends a list of messages and
 * constraints; the client makes the AI call and returns the response.
 *
 * This cleanly splits responsibility: the server knows what to ask,
 * but the client owns the AI provider relationship (API keys, model choice).
 *
 * `createSamplingHandler` is a **factory function** — it captures the
 * model name once and returns a handler function. The factory runs at
 * setup time; the returned handler runs once per sampling request.
 * ═══════════════════════════════════════════════════════════════════
 */

import { completion } from "./ai.js";
// Imports the `completion` async function from ai.js — makes the actual HTTP call to the AI provider.

import { clientLog } from "./log.js";
// Imports the logging helper object for sampling-related console messages.

/**
 * Creates a sampling request handler for the MCP client.
 *
 * @param {string} model — model identifier passed to the AI provider
 */
export const createSamplingHandler = (model) => async (request) => {
// `export` makes this factory importable.
// This is a curried function — a function that returns another function.
//   Outer call: `createSamplingHandler(model)` — runs once at setup, returns the handler.
//   Inner call: `async (request) => { ... }` — the actual handler, called by the MCP SDK per request.
// `model` is a string captured in a closure — the inner function always has access to it,
// even though `model` was passed to the outer function at a different point in time.

  clientLog.samplingRequest(request.params);
  // Logs the incoming sampling request details.
  // `request` is the raw MCP request object; `request.params` has `messages` and `maxTokens`.

  try {
  // Wraps the async work in try/catch — if the AI call fails, we catch it and re-throw cleanly.

    const { messages, maxTokens } = request.params;
    // Destructuring — pulls `messages` and `maxTokens` out of the params object in one line.
    // `messages` is an array of MCP message objects; `maxTokens` is a number (or undefined).

    // Convert MCP message format → Responses API input format
    const input = messages.map(({ role, content }) => ({
      role,
      content: content?.type === "text" ? content.text : JSON.stringify(content)
    }));
    // `.map()` transforms every element in `messages` into a new object.
    // The callback `({ role, content }) => ({...})` destructures each MCP message as it's processed.
    //   `role` stays the same (string: "user" or "assistant").
    //   `content` in MCP format is an object like `{ type: "text", text: "hello" }`.
    //     The Responses API wants a plain string, so we extract `.text` if type is "text",
    //     or fall back to `JSON.stringify(content)` for other content types.
    // `content?.type === "text"` — optional chaining: safe if `content` is null.
    // `=> ({...})` — the outer parens around the returned object are required:
    //   without them `{}` would be mistaken for the function body, not an object literal.
    // `input` is an array of `{ role: string, content: string }` objects.

    const text = await completion({ model, input, max_output_tokens: maxTokens ?? 500 });
    // Calls the AI provider with the converted messages.
    // `maxTokens ?? 500` — nullish coalescing: use 500 as the default max tokens if the server didn't specify.
    // `await` pauses until the HTTP request completes and the text comes back.
    // `text` is a string — the LLM's response.

    clientLog.samplingResponse(text);
    // Logs a truncated preview of the response for debugging.

    // Return in the MCP sampling response format
    return { role: "assistant", content: { type: "text", text }, model };
    // Returns the result in the format the MCP SDK expects for a sampling response.
    // `role: "assistant"` marks this as the model's reply.
    // `content: { type: "text", text }` — `text` here is property shorthand for `text: text`.
    // `model` — includes which model responded; useful for logging on the server side.

  } catch (error) {
    clientLog.samplingError(error);
    throw error;
    // Logs the error, then re-throws it.
    // Re-throwing propagates the rejection up the call stack — the MCP SDK will treat this
    // as a failed sampling request and forward the failure to the server.
    // Not swallowing the error is important: the server needs to know sampling failed.
  }
};
