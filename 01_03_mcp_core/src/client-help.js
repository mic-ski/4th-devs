/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: src/client.js — MCP Client factory
 * ═══════════════════════════════════════════════════════════════════
 *
 * Creates and connects an MCP client over stdio transport. In the MCP
 * architecture, the "client" is the host application (e.g. Claude Desktop,
 * Cursor, or this demo). It spawns the server as a subprocess and
 * communicates with it via stdin/stdout.
 *
 * The client registers handlers for two server-initiated request types:
 *  - sampling:    server asks the client to call an LLM on its behalf
 *  - elicitation: server asks the client for structured user input
 *
 * `createMcpClient` is a **factory function** — it is NOT a class.
 * It's a plain async function that builds and returns a connected client
 * object. This is a deliberate JS pattern: bundling behaviour in a plain
 * object without the overhead of `class`.
 * ═══════════════════════════════════════════════════════════════════
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// Imports the MCP Client class from the official SDK.
// This is a named import — `Client` is one of several exports from that module.
// The SDK handles the MCP protocol details; we just configure and connect it.

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
// The transport handles the physical communication channel.
// `StdioClientTransport` spawns the server as a child subprocess and pipes stdin/stdout.
// Other transports exist (HTTP/SSE) but stdio is standard for local integrations.

import {
  CreateMessageRequestSchema,
  ElicitRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
// These are Zod schemas (schema objects) describing the shape of specific MCP protocol messages.
// They're used to register typed request handlers — the SDK validates incoming requests against them.
// `CreateMessageRequestSchema` identifies sampling requests; `ElicitRequestSchema` identifies elicitation.

import { createSamplingHandler } from "./sampling.js";
import { createElicitationHandler } from "./elicitation.js";
import { clientLog } from "./log.js";
// Three local imports: the sampling and elicitation handler factories, and the logging helper.
// Both handler imports are factory functions — they return handler functions, not direct results.

import { fileURLToPath } from "url";
import { dirname, join } from "path";
// Node.js built-in modules for working with file paths.
// In ES modules (files using `import`/`export`), `__dirname` is not available automatically.
// These utilities let us reconstruct it from the module's URL.

const __dirname = dirname(fileURLToPath(import.meta.url));
// `import.meta.url` is the full URL of the current file (e.g. `file:///C:/project/src/client.js`).
// `fileURLToPath()` converts that URL to a regular filesystem path string.
// `dirname()` strips the filename, leaving just the directory path.
// Result: `__dirname` is the directory of this file — the standard ES module workaround.

/**
 * @param {object} options
 * @param {string} options.model — model for sampling completions
 * @param {string} options.serverPath — path to server script (default: ./server.js)
 * @param {function} options.onElicitation — custom elicitation handler (default: auto-accept)
 */
export const createMcpClient = async ({ model, serverPath, onElicitation } = {}) => {
// `export` makes this function importable by other files.
// `async` — this function is asynchronous because connecting to the server takes time.
// The single parameter is destructured: `{ model, serverPath, onElicitation }` pulls three
// named properties from the options object the caller passes.
// `= {}` is a default parameter — if the caller passes nothing, use an empty object so
// destructuring doesn't throw "cannot destructure undefined".
// model: string, serverPath: string|undefined, onElicitation: function|undefined

  const client = new Client(
    { name: "mcp-core-client", version: "1.0.0" },
    {
      capabilities: {
        sampling: {},
        elicitation: { form: {} }
      }
    }
  );
  // Creates an MCP Client instance using the SDK class.
  // First argument: identity — the name and version sent to the server during handshake.
  // Second argument: capabilities — tells the server what this client supports.
  //   `sampling: {}` declares the client can handle sampling requests (server can ask for LLM calls).
  //   `elicitation: { form: {} }` declares support for the "form" elicitation mode.
  // `client` is an object (type: Client instance) with methods like setRequestHandler, connect, close.

  // Register handlers for server-initiated requests
  client.setRequestHandler(CreateMessageRequestSchema, createSamplingHandler(model));
  // `setRequestHandler` registers a callback for a specific incoming request type.
  // First arg: the schema identifying which request type to listen for.
  // Second arg: the handler function. `createSamplingHandler(model)` is called NOW (the factory runs),
  //   returning a handler function that the SDK will call LATER when requests arrive.
  // `model` is captured in the returned handler's closure — available whenever the handler runs.

  client.setRequestHandler(ElicitRequestSchema, createElicitationHandler({ onElicitation }));
  // Same pattern for elicitation — registers a handler for when the server asks for user input.
  // `{ onElicitation }` shorthand passes the caller's custom handler (or undefined) into the factory.

  // Spawn the server as a child process and connect over stdio
  const resolvedPath = serverPath || join(__dirname, "server.js");
  // If `serverPath` was provided, use it. Otherwise, build the default path to server.js.
  // `join(__dirname, "server.js")` creates a safe absolute path — works across operating systems.
  // `resolvedPath` is a string.

  clientLog.spawningServer(resolvedPath);
  // Logs that the server is about to be spawned.
  // `clientLog` is an object (from log.js) bundling several logging functions as properties.
  // This is the **object-as-instance** pattern — a plain object with methods, not a class.

  const transport = new StdioClientTransport({
    command: "node",
    args: [resolvedPath],
    stderr: "inherit"
  });
  // Creates the stdio transport object — this is what physically spawns the subprocess.
  // `command: "node"` — run Node.js as the subprocess.
  // `args: [resolvedPath]` — pass the server script path as the argument (equivalent to `node server.js`).
  // `stderr: "inherit"` — the server's error output flows directly to our terminal instead of being swallowed.
  // `transport` is an object (type: StdioClientTransport).

  await client.connect(transport);
  // `connect` is async — it starts the subprocess and performs the MCP handshake.
  // `await` pauses until the connection is established and the client is ready to use.

  clientLog.connected();
  // Logs a success message.

  return client;
  // Returns the fully connected client object to the caller.
  // The caller (app.js) uses this to call listTools, callTool, readResource, etc.
};
