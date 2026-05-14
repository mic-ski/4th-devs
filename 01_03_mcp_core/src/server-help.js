#!/usr/bin/env node
// Shebang line — tells Unix/Linux/macOS to run this file using Node.js when executed directly.
// On Windows it's ignored; Node.js is invoked explicitly by the client (e.g. `node server.js`).
// Must be the very first line of the file for the OS to recognise it.

/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: src/server.js — MCP Server entry point and capability registry
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is the MCP server. It runs as a separate Node.js subprocess spawned
 * by the client (client.js). It communicates via stdin/stdout (stdio transport).
 *
 * The server's job: register capabilities (tools, resources, prompts) and
 * then wait for the client to send requests. The actual definitions live in
 * tools.js, resources.js, and prompts.js — this file is just the registry
 * and transport wiring.
 * ═══════════════════════════════════════════════════════════════════
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Imports the McpServer class from the official MCP SDK.
// This handles all MCP protocol details — we just register capabilities and connect.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Imports the stdio transport — enables communication via stdin/stdout.
// This is what lets the client spawn this file as a subprocess and talk to it through pipes.

import { tools } from "./tools.js";
import { resources } from "./resources.js";
import { prompts } from "./prompts.js";
// Imports the three arrays of capability definitions from their files.
// `tools`, `resources`, and `prompts` are all arrays of plain definition objects.
// These are the actual capabilities the server will expose to connected clients.

const createServer = () => {
// A factory function — NOT a class. Creates, configures, and returns the server object.
// Not `async` because constructing the server object itself is synchronous.
// The async work (connecting to the transport) happens in `main` below.

  const server = new McpServer(
    { name: "mcp-core-demo", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );
  // Creates the server instance using the SDK class.
  // First argument: identity — name and version sent to clients during the MCP handshake.
  // Second argument: capabilities — advertises to connecting clients what this server supports.
  //   `tools: {}`, `resources: {}`, `prompts: {}` — the empty objects declare support for each feature.
  // `server` is an object (type: McpServer) with registerTool, registerResource, registerPrompt methods.

  tools.forEach(({ name, config, handler }) =>
    server.registerTool(name, config, handler)
  );
  // `.forEach()` iterates the `tools` array, calling the callback once per element.
  // `({ name, config, handler })` — destructuring in the callback parameter: pulls three properties
  //   from each tool definition object as it's processed.
  // `server.registerTool(...)` tells the SDK about this tool:
  //   name (string): what clients use to call it
  //   config (object): metadata + input schema
  //   handler (function): the async function to run when the tool is called

  resources.forEach(({ id, uri, config, handler }) =>
    server.registerResource(id, uri, config, handler)
  );
  // Same pattern — registers each resource. Resources have both `id` and `uri`:
  //   `id` is the internal registration key
  //   `uri` is the address clients use to read the resource (e.g. "config://project")

  prompts.forEach(({ name, config, handler }) =>
    server.registerPrompt(name, config, handler)
  );
  // Same pattern for prompts — registers each template with the server.

  return server;
  // Returns the fully configured (but not yet connected) server object.
};

const main = async () => {
// The entry point — `async` because `server.connect` is asynchronous.

  const server = createServer();
  // Builds and configures the server by calling the factory above.
  // `server` is the McpServer object with all capabilities already registered.

  await server.connect(new StdioServerTransport());
  // `new StdioServerTransport()` creates the transport object — no args needed.
  // `server.connect(transport)` is async — opens the stdio channel and performs the MCP handshake.
  // `await` pauses until the connection is live.
  // After this line, the server is running and listening for client requests indefinitely.

  const exit = async () => { await server.close(); process.exit(0); };
  // Defines a cleanup function as an async arrow function assigned to `const`.
  // `server.close()` is async — gracefully shuts down the MCP connection and flushes buffers.
  // `process.exit(0)` terminates the Node.js process. `0` is the exit code meaning "success".
  // This function is not called yet — it's registered as a signal handler on the next two lines.

  process.on("SIGINT", exit);
  process.on("SIGTERM", exit);
  // `process.on(eventName, handler)` registers a listener on the global Node.js process object.
  // SIGINT is the signal sent when the user presses Ctrl+C in the terminal.
  // SIGTERM is sent by the OS or orchestration tools (Docker, systemd) to request graceful shutdown.
  // Without these, the process would terminate abruptly without closing the MCP connection cleanly.
};

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
// Calls `main()`, which returns a Promise (all async functions do).
// `.catch((error) => { ... })` handles any unhandled rejection from `main`.
// `console.error` writes to stderr — visible in the parent process's terminal (because `stderr: "inherit"`).
// `process.exit(1)` exits with code 1 — signals failure to the OS or parent process.
// This is the standard top-level error handler for an async Node.js entry point.
