/**
 * In-memory MCP server with mock tools (weather, time).
 *
 * Unlike mcp_core which uses stdio transport, this server runs
 * in the same process and connects via InMemoryTransport.
 * The tools are intentionally simple — the point of this example
 * is the unified agent loop, not the tool implementations.
 */
// This file creates an MCP server and registers two fake tools on it:
// get_weather and get_time. The server runs inside the same Node.js process,
// communicating with the client via in-memory transport instead of a network.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
// McpServer is the class that represents the server side of the MCP protocol.
// z is from Zod — a library for defining and validating data schemas.
// We use it to describe what arguments each tool accepts.

export const createMcpServer = () => {
// Regular (non-async) function — just creates and configures an object, no async work yet.
// Returns the configured server instance.

  const server = new McpServer(
    { name: "demo-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  // Create a new server instance. The second argument declares capabilities —
  // { tools: {} } tells the client "yes, this server supports tools".

  server.registerTool(
    "get_weather",
    // First argument: the tool's name — this is what the LLM will call.

    {
      description: "Get current weather for a city",
      inputSchema: { city: z.string().describe("City name") }
    },
    // Second argument: metadata. inputSchema uses Zod to say:
    // "this tool takes one argument called city, and it must be a string".
    // z.string() is a Zod schema for a string value.
    // .describe() adds a human-readable description used in the tool definition sent to the LLM.

    async ({ city }) => {
    // Third argument: the actual handler function — what runs when the tool is called.
    // async because it could do real async work (here it's just fake data).
    // { city } destructures the args object to get the city value directly.

      const conditions = ["sunny", "cloudy", "rainy", "snowy"];
      // An array of possible weather conditions.

      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      // Pick a random item from the array.
      // Math.random() returns a float between 0 and 1 (exclusive).
      // Multiply by array length to get a float between 0 and 4 (exclusive).
      // Math.floor() rounds it down to 0, 1, 2, or 3 — a valid array index.

      const temp = Math.floor(Math.random() * 35) - 5;
      // Random integer between -5 and 29. (0–34, then subtract 5)

      return {
        content: [{ type: "text", text: JSON.stringify({ city, condition, temperature: `${temp}°C` }) }]
      };
      // MCP tool results must follow this format: an object with a content array.
      // Each item in content has a type and a value.
      // We use type "text" and stringify the result object into a JSON string.
      // The client (client.js) will parse this string back into an object.
    }
  );

  server.registerTool(
    "get_time",
    {
      description: "Get current time in a specified timezone",
      inputSchema: { timezone: z.string().describe("Timezone (e.g., 'UTC', 'America/New_York')") }
    },
    async ({ timezone }) => {
      try {
        const time = new Date().toLocaleString("en-US", { timeZone: timezone });
        // new Date() creates an object representing the current moment.
        // .toLocaleString() formats it as a human-readable string.
        // The second argument sets options — here we pass a specific timezone.
        // If the timezone string is invalid, this throws an error.

        return {
          content: [{ type: "text", text: JSON.stringify({ timezone, time }) }]
        };
        // Same MCP return format as get_weather.

      } catch {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Invalid timezone: ${timezone}` }) }],
          isError: true
        };
        // If toLocaleString() threw (invalid timezone), we catch the error here.
        // Instead of crashing, we return an error response in MCP format.
        // isError: true signals to the client that this is an error result.
        // Note: catch {} with no variable is valid in modern JS — we don't need the error object here.
      }
    }
  );

  return server;
  // Return the fully configured server so createMcpClient() in client.js can connect to it.
};
