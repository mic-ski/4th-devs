/**
 * MCP client — connects to a server via in-memory transport.
 *
 * In-memory transport is used here because the server runs in the same
 * process (unlike mcp_core which uses stdio for a subprocess).
 * The wrapper functions bridge MCP tool format to OpenAI function format
 * so the agent can treat MCP tools like any other tool.
 */
// This file sets up the MCP client — the part that talks TO the MCP server.
// It also provides helper functions to list tools, call them, and convert
// their format so the agent can use them alongside native JS tools.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
// Importing classes from the MCP SDK (an external npm package).
// Client is the MCP client class.
// InMemoryTransport is a transport layer that works inside the same process —
// no network, no subprocess, just objects passing messages in memory.

export const createMcpClient = async (server) => {
// Async function — connecting to the server involves async handshake steps.
// Takes a server instance (created by createMcpServer in server.js) as an argument.

  const client = new Client(
    { name: "demo-mcp-client", version: "1.0.0" },
    { capabilities: {} }
  );
  // Create a new Client instance. The first argument is metadata (name/version),
  // the second declares what capabilities this client supports — empty here
  // because we only need basic tool calling.

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  // Creates two linked transport objects — messages sent to one arrive at the other.
  // This is array destructuring: createLinkedPair() returns an array of two items,
  // and we unpack them into two named variables in one line.
  // Think of it as creating two ends of a pipe.

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  // Connect each end to its matching side. Order matters — server first, then client.
  // await pauses until each connection handshake completes before moving on.

  return client;
  // Return the connected client so the caller can use it to list and call tools.
};

export const listMcpTools = async (client) => {
  const { tools } = await client.listTools();
  return tools;
};
// Asks the MCP server for the list of tools it provides.
// client.listTools() returns an object like { tools: [...] }.
// { tools } destructures that object to pull out just the tools array.
// We return the array directly so callers don't have to destructure it themselves.

// Calls an MCP tool and parses the text result
export const callMcpTool = async (client, name, args) => {
  const result = await client.callTool({ name, arguments: args });
  // Call a tool by name with the given args. { name, arguments: args } is shorthand —
  // name: name becomes just name, but arguments can't use shorthand because the key
  // is "arguments" and the variable is "args", so we write it out explicitly.

  const textContent = result.content.find((c) => c.type === "text");
  // result.content is an array of content items. MCP tools can return multiple types
  // (text, images, etc). .find() returns the FIRST item where the condition is true,
  // or undefined if none match. Here we look for the text item.

  return textContent ? JSON.parse(textContent.text) : result;
  // Ternary: if we found a text item, parse its JSON string into a JS object.
  // If there's no text content at all, return the raw result as a fallback.
};

// Converts MCP tool schemas → OpenAI function-calling format
export const mcpToolsToOpenAI = (mcpTools) =>
  mcpTools.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    strict: true
  }));
// MCP tools use their own schema format. The OpenAI/Responses API expects a different format.
// This function converts one to the other so the agent can send all tools (MCP and native)
// to the LLM in one consistent list.
// .map() transforms every item in the array and returns a new array of the same length.
// The arrow function returns an object literal — the outer () around {} are needed so JS
// doesn't treat { as the start of a function body.
