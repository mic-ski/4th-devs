/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: src/resources.js — MCP resource definitions for the demo server
 * ═══════════════════════════════════════════════════════════════════
 *
 * Resources in MCP are read-only data the server makes available.
 * Clients discover them via listResources and fetch specific ones via
 * readResource. Unlike tools, resources don't perform actions — they
 * just return data.
 *
 * This file exports two resource definitions:
 *  - config://project — static: always returns the same project metadata
 *  - data://stats     — dynamic: generates fresh stats on every read
 *
 * Each definition has: id, uri, config (metadata), and handler (data provider).
 * server.js imports this array and registers each resource with the MCP server.
 * ═══════════════════════════════════════════════════════════════════
 */

const startTime = Date.now();
// `Date.now()` returns the current timestamp as milliseconds since the Unix epoch (type: number).
// Captured once when this module is first loaded — used to calculate uptime in the stats resource.
// JS modules are cached after the first import, so `startTime` is set once for the server's lifetime.

let requestCount = 0;
// `let` declares a variable that can be reassigned — unlike `const`.
// Starts at 0 and is incremented each time the stats resource is read.
// Module-level state — persists across all resource requests during the server's lifetime.

export const resources = [
// `export` makes this array importable by server.js.
// Type: Array<{ id: string, uri: string, config: object, handler: function }>

  // Static resource — always returns the same project metadata
  {
    id: "project-config",
    // Internal identifier the MCP server uses to register this resource.

    uri: "config://project",
    // The address clients use to read this resource: `client.readResource({ uri: "config://project" })`.
    // `config://` is a custom URI scheme the server defines — it's just an agreed-upon string address.

    config: { title: "Project Configuration", description: "Current project settings", mimeType: "application/json" },
    // Metadata the SDK uses when listing resources to clients.
    // `mimeType: "application/json"` tells the client the content is JSON.

    handler: async () => ({
      contents: [{
        uri: "config://project",
        mimeType: "application/json",
        text: JSON.stringify({
          name: "mcp-core-demo",
          version: "1.0.0",
          features: ["tools", "resources", "prompts", "elicitation", "sampling"]
        }, null, 2)
      }]
    })
    // Arrow function with no parameters — `async () =>` because MCP handlers must return Promises.
    // The body is `(...)` — parentheses around an object literal.
    // Without parens, `{}` would be mistaken for a function body. The parens force it to be an object.
    // `JSON.stringify({ ... }, null, 2)`:
    //   first arg: the object to serialise
    //   second arg: replacer (null = include all fields)
    //   third arg: 2 = indent each level with 2 spaces (produces readable multi-line JSON)
    // The whole result is a string (type: string) stored in `text`.
    // `contents` is an array — the MCP resource result format wraps data in one or more content blocks.
  },

  // Dynamic resource — content changes on every read
  {
    id: "runtime-stats",
    uri: "data://stats",
    config: { title: "Runtime Statistics", description: "Dynamic server stats", mimeType: "application/json" },
    handler: async () => {
      requestCount++;
      // `++` is the post-increment operator — adds 1 to `requestCount` and saves the new value back.
      // This mutates the module-level variable declared above.
      // Each call to this handler increments the counter, so it reflects real request count.

      return {
        contents: [{
          uri: "data://stats",
          mimeType: "application/json",
          text: JSON.stringify({
            uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
            request_count: requestCount,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
      // Same structure as the static resource, but values are computed fresh on each call.
      // `Date.now() - startTime` — elapsed milliseconds since the server started.
      // Dividing by 1000 converts to seconds; `Math.floor(...)` rounds down to a whole number.
      // `new Date()` creates a Date object for right now.
      // `.toISOString()` formats it as an ISO 8601 string — e.g. "2026-05-14T10:30:00.000Z" (type: string).
      // `requestCount` is the incremented counter — always reflects the number of times this resource was read.
    }
  }
];
