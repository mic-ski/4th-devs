/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: src/prompts.js — MCP prompt definitions for the demo server
 * ═══════════════════════════════════════════════════════════════════
 *
 * Prompts in MCP are reusable message templates with parameters.
 * Instead of hardcoding instructions in every tool, a server can publish
 * prompt templates that clients discover via listPrompts and instantiate
 * via getPrompt with runtime values.
 *
 * This file exports one array of prompt definitions. Each entry has:
 *  - name:    the identifier clients use to request this prompt
 *  - config:  metadata and the parameter schema (Zod-based)
 *  - handler: async function that fills in the template and returns messages
 *
 * server.js imports this array and registers each prompt with the MCP server.
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
// Imports Zod — a schema validation and description library.
// `z` is the main namespace: `z.string()`, `z.number()`, `z.enum()` etc. build type schemas.
// Here it describes the expected types of the prompt's parameters.

export const prompts = [
// `export` makes this array importable by server.js.
// Type: Array<{ name: string, config: object, handler: function }>
// Each element is a plain object — not a class instance.

  {
    name: "code-review",
    // The string identifier used by clients: `client.getPrompt({ name: "code-review", ... })`.

    config: {
      title: "Code Review",
      description: "Template for code review requests",
      argsSchema: {
        code: z.string().describe("The code to review"),
        language: z.string().optional().describe("Programming language"),
        focus: z.enum(["security", "performance", "readability", "all"]).optional()
      }
    },
    // `config` is the metadata object the MCP SDK uses to register and describe this prompt.
    // `argsSchema` defines what arguments the prompt accepts, validated by Zod:
    //   `code` — required string. No `.optional()` means it must always be provided.
    //   `language` — optional string. `.optional()` allows the caller to omit it entirely.
    //   `focus` — optional enum. Must be one of the four listed strings if provided.
    // `.describe(...)` attaches a human-readable label that tools and UIs can display.

    handler: async ({ code, language = "unknown", focus = "all" }) => {
    // `async` — MCP handlers must return Promises (the SDK awaits the result).
    // The parameter is destructured: pulls `code`, `language`, and `focus` from the args object.
    // `language = "unknown"` is a default parameter — used if the caller didn't pass a language.
    // `focus = "all"` — defaults to reviewing everything if not specified.

      const focusMap = {
        security: "Focus on security vulnerabilities and input validation.",
        performance: "Focus on performance and optimization.",
        readability: "Focus on code clarity and maintainability.",
        all: "Review for security, performance, and readability."
      };
      // Plain object used as a lookup table — maps each `focus` value to its instruction string.
      // Avoids a long if/else chain. `focusMap[focus]` does the lookup: `focus` is the key.
      // `focusMap` is a local variable — only available inside this handler call.

      return {
        messages: [{
          role: "user",
          content: { type: "text", text: `Review this ${language} code.\n\n${focusMap[focus]}\n\n\`\`\`${language}\n${code}\n\`\`\`` }
        }]
      };
      // Returns the MCP prompt result — an object with a `messages` array.
      // Each message has `role` ("user" or "assistant") and a `content` object.
      // `content.type: "text"` tells the client this is a plain text message.
      // The `text` value is a template literal assembling the full prompt:
      //   `\n\n` — two newlines (a blank line) to visually separate sections.
      //   `focusMap[focus]` — looked up above, inserts the relevant instruction sentence.
      //   `\`\`\`` — an escaped backtick: produces the markdown code fence character (```).
      //   `${language}` and `${code}` — embed the caller's runtime values.
    }
  }
];
