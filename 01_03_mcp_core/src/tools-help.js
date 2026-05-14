/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: src/tools.js — MCP tool definitions for the demo server
 * ═══════════════════════════════════════════════════════════════════
 *
 * Tools in MCP are actions the LLM can invoke. Each tool has an input
 * schema (what arguments it accepts) and a handler (what it does).
 *
 * This file exports two tools:
 *  - calculate:                  basic arithmetic — simple request/response
 *  - summarize_with_confirmation: demonstrates two advanced MCP features:
 *      - elicitation: server asks the client for user confirmation
 *      - sampling:    server asks the client to call an LLM
 *    Both use `extra.sendRequest()` — the server calling back into the client.
 *
 * server.js imports this array and registers each tool with the MCP server.
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
// Imports Zod — a schema validation library.
// `z` is the main namespace: `z.string()`, `z.number()`, `z.enum()` etc. build type schemas.
// Used here to define and validate each tool's input arguments.

// Helpers for building MCP tool results
const textResult = (text) => ({ content: [{ type: "text", text }] });
const errorResult = (msg) => ({ content: [{ type: "text", text: msg }], isError: true });
// Two private helper arrow functions — each returns a correctly shaped MCP tool result object.
// MCP tool results must have a `content` array where each item has `type` and the actual value.
// `textResult` builds a normal result; `errorResult` adds `isError: true` to signal failure.
// `{ content: [{ type: "text", text }] }` — `text` here is property shorthand for `text: text`.
// Both return type: object with `content` array; `errorResult` also has `isError: boolean`.

// Zod schemas for validating client responses to server-initiated requests
const elicitationResponseSchema = z.object({
  action: z.enum(["accept", "decline", "cancel"]),
  content: z.record(z.unknown()).optional()
});
// Zod schema for the shape of an elicitation response from the client.
// `z.object({ ... })` defines an object with specific named properties.
// `z.enum([...])` — `action` must be exactly one of those three strings.
// `z.record(z.unknown())` — `content` is an object with any string keys and any values.
// `.optional()` — `content` is allowed to be absent.
// This schema is passed to `extra.sendRequest()` so it can validate the client's response.

const samplingResponseSchema = z.object({
  role: z.string(),
  content: z.object({ type: z.string(), text: z.string() }),
  model: z.string().optional()
});
// Zod schema for the shape of a sampling response from the client.
// `role`: required string (expected to be "assistant")
// `content`: a nested object with both `type` and `text` as required strings
// `model`: optional string — which model was actually used (not all clients provide this)

// Builds an elicitation/create request — asks the client to show a confirmation form
const confirmationForm = (text) => ({
  method: "elicitation/create",
  params: {
    mode: "form",
    message: `Do you want to summarize this text?\n\n"${text.slice(0, 100)}${text.length > 100 ? "..." : ""}"`,
    requestedSchema: {
      type: "object",
      properties: {
        confirm: { type: "boolean", title: "Confirm", description: "Proceed with summarization?", default: true },
        style: { type: "string", title: "Summary Style", enum: ["concise", "detailed", "bullet-points"], default: "concise" }
      },
      required: ["confirm"]
    }
  }
});
// Private factory function — takes the text to summarise and returns a full MCP request object.
// The returned object is passed to `extra.sendRequest()` which sends it to the client.
// `method: "elicitation/create"` — the MCP method name for elicitation requests.
// `mode: "form"` — the only mode currently defined by the MCP spec.
// `message` is the prompt shown to the user — assembled with a template literal.
//   `text.slice(0, 100)` — first 100 characters of the text (string).
//   `text.length > 100 ? "..." : ""` — appends ellipsis if the text was truncated (ternary).
// `requestedSchema` is a JSON Schema object describing the form fields:
//   `confirm`: a boolean field with a default of `true`
//   `style`: an enum field with three options, default "concise"
//   `required: ["confirm"]` — `confirm` must always be present in the response.

// Builds a sampling/createMessage request — asks the client to call an LLM
const samplingMessage = (text, style, maxLength) => ({
  method: "sampling/createMessage",
  params: {
    messages: [{ role: "user", content: { type: "text", text: `Summarize in a ${style} style. Max ${maxLength} words.\n\nText: ${text}` } }],
    maxTokens: 200
  }
});
// Private factory — returns the MCP request object for a sampling call.
// `method: "sampling/createMessage"` — the MCP method name for sampling requests.
// `messages` is an array of message objects in MCP format (role + typed content).
// The message text is a template literal combining the requested style, word limit, and input text.
// `maxTokens: 200` — caps the LLM response length to prevent runaway completions.

export const tools = [
// `export` makes this array importable by server.js.
// Type: Array<{ name: string, config: object, handler: function }>

  {
    name: "summarize_with_confirmation",
    config: {
      title: "Summarize with Confirmation",
      description: "Summarizes text after getting user confirmation. Demonstrates elicitation and sampling.",
      inputSchema: {
        text: z.string().describe("The text to summarize"),
        maxLength: z.number().optional().describe("Maximum summary length in words")
      }
    },
    // `name` is the identifier clients use: `client.callTool({ name: "summarize_with_confirmation" })`.
    // `config` holds metadata and the Zod input schema.
    // `inputSchema` declares what this tool expects:
    //   `text` — required string
    //   `maxLength` — optional number (word limit)

    handler: async ({ text, maxLength = 50 }, extra) => {
    // `async` — tool handlers must return Promises.
    // First parameter is destructured from the tool's arguments: `text` (string) and `maxLength` (number).
    // `maxLength = 50` — default value if not provided by the caller.
    // `extra` is a second parameter injected by the MCP SDK — it provides `sendRequest()` for
    //   calling back into the client from within a tool handler. This is what enables elicitation and sampling.

      try {
        // Step 1: Ask the client for user confirmation (elicitation)
        const confirmation = await extra.sendRequest(confirmationForm(text), elicitationResponseSchema);
        // `extra.sendRequest(request, schema)` sends a request back to the client and waits for the response.
        // First arg: the request object (built by `confirmationForm`).
        // Second arg: the Zod schema used to validate the response the client sends back.
        // `await` pauses the tool handler until the client responds.
        // `confirmation` is the validated response object — e.g. `{ action: "accept", content: { confirm: true, style: "concise" } }`.

        if (confirmation.action !== "accept" || !confirmation.content?.confirm) {
          return textResult("Summarization cancelled by user.");
        }
        // If the user declined or didn't confirm, bail out early with a cancellation message.
        // `confirmation.action !== "accept"` — catches "decline" and "cancel".
        // `!confirmation.content?.confirm` — checks the boolean confirm field; `?.` is safe if `content` is absent.
        // `||` means either condition being true will cancel — we need both to proceed.

        // Step 2: Ask the client to summarize via its LLM (sampling)
        const style = confirmation.content?.style || "concise";
        const result = await extra.sendRequest(samplingMessage(text, style, maxLength), samplingResponseSchema);
        // `confirmation.content?.style` — reads the style the user picked from the form.
        // `|| "concise"` — falls back to "concise" if style is absent or empty.
        // Then calls `extra.sendRequest` again, this time with a sampling request.
        // The client will call its AI provider and return the LLM's response.
        // `result` is the validated sampling response — e.g. `{ role: "assistant", content: { type: "text", text: "..." }, model: "..." }`.

        return textResult(`Summary (${style} style):\n\n${result.content.text}`);
        // Returns the summary wrapped in a standard MCP text result.
        // `result.content.text` is the LLM's response string.
        // `\n\n` adds a blank line between the label and the summary content.

      } catch (error) {
        return errorResult(`Error: ${error.message}. Elicitation/sampling may not be supported by the client.`);
        // If anything threw (sendRequest failed, client doesn't support the feature), return an error result.
        // `error.message` is the built-in Error property containing the human-readable message (type: string).
        // `errorResult` builds the MCP error response format (sets `isError: true`).
      }
    }
  },

  {
    name: "calculate",
    config: {
      title: "Calculator",
      description: "Performs basic arithmetic operations",
      inputSchema: {
        operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("The operation"),
        a: z.number().describe("First operand"),
        b: z.number().describe("Second operand")
      }
    },
    // Simpler tool — no elicitation or sampling. Just validates inputs and returns a result.
    // `inputSchema` enforces: operation must be one of four strings, a and b must be numbers.

    handler: async ({ operation, a, b }) => {
    // Parameters destructured directly — `operation` (string), `a` (number), `b` (number).

      const ops = {
        add: () => a + b,
        subtract: () => a - b,
        multiply: () => a * b,
        divide: () => (b !== 0 ? a / b : "Error: Division by zero")
      };
      // Plain object used as a dispatch table — maps operation names to their functions.
      // Each value is an arrow function (`() => ...`) — closures that capture `a` and `b` from above.
      // `divide` uses a ternary to guard against division by zero: returns a string message if `b` is 0.
      // This avoids a long switch statement and keeps each operation on one clean line.

      return textResult(JSON.stringify({ operation, a, b, result: ops[operation]() }));
      // `ops[operation]` looks up the right function using `operation` as the key.
      // `ops[operation]()` calls it — the parentheses execute the arrow function.
      // `{ operation, a, b, result: ... }` — property shorthand for the first three, then `result` is computed.
      // `JSON.stringify(...)` converts the result object to a JSON string (single-line, no indentation).
      // `textResult(...)` wraps it in the MCP tool result format.
    }
  }
];
