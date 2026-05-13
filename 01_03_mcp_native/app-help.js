/**
 * MCP Native Demo — one agent using both MCP tools and native JS tools.
 *
 * Shows how MCP tools (from a server) and plain function tools can be
 * unified behind a single handler map and driven by the same agent loop.
 * The model doesn't know which tools are MCP and which are native.
 */
// This is the entry point — the file you actually run.
// Its job is to wire everything together: create the server, client, tools,
// and agent, then fire off a list of test queries.

import { createMcpServer } from "./src/mcp/server.js";
import { createMcpClient, listMcpTools, mcpToolsToOpenAI, callMcpTool } from "./src/mcp/client.js";
import { nativeTools, nativeHandlers } from "./src/native/tools.js";
import { createAgent } from "./src/agent.js";
import { MCP_LABEL, NATIVE_LABEL } from "./src/log.js";
import { resolveModelForProvider } from "../config.js";
// All imports at the top. Each line pulls in specific named exports from other files.
// The path "../config.js" goes up one directory (out of 01_03_mcp_native) to the shared config.

const model = resolveModelForProvider("gpt-5.2");
// Resolves the model name to the correct identifier for whichever provider is configured.
// Defined at module level (outside any function) so it's available everywhere in this file.

const instructions = `You are a helpful assistant with access to various tools.
You can check weather, get time, perform calculations, and transform text.
Use the appropriate tool for each task. Be concise.`;
// The system prompt — sent to the LLM with every request to set its behaviour.
// A multi-line template literal: backtick strings can span multiple lines without
// needing escape characters or string concatenation.

const main = async () => {
// The main function wraps all the async startup logic.
// We need async here because connecting the MCP server/client requires await.
// It's a common JS pattern to wrap top-level async code in a main() function
// because you can't use await directly at the top level in all environments.

  // Start in-memory MCP server and connect a client
  const mcpServer = createMcpServer();
  const mcpClient = await createMcpClient(mcpServer);
  const mcpTools = await listMcpTools(mcpClient);
  // Three setup steps in order — each depends on the previous one.
  // createMcpServer() is synchronous (just builds an object), so no await needed.
  // createMcpClient() is async (does the connection handshake), so we await it.
  // listMcpTools() is async (asks the server for its tool list), so we await it too.

  // Unified handler map — MCP and native tools behind the same { execute, label } interface
  const handlers = Object.fromEntries([
    ...mcpTools.map((t) => [t.name, {
      execute: (args) => callMcpTool(mcpClient, t.name, args),
      label: MCP_LABEL
    }]),
    ...Object.entries(nativeHandlers).map(([name, fn]) => [name, {
      execute: fn,
      label: NATIVE_LABEL
    }])
  ]);
  // This builds one object where every tool (MCP or native) has the same shape:
  // { execute: function, label: string }
  // That way agent.js doesn't need to know which backend a tool uses.
  //
  // Object.fromEntries() takes an array of [key, value] pairs and builds an object from them.
  // It's the reverse of Object.entries().
  //
  // The spread operator ... merges two arrays into one before passing to fromEntries:
  //   - First array: MCP tools. mcpTools.map() produces [[toolName, {execute, label}], ...]
  //     execute wraps callMcpTool so the agent just calls execute(args) without knowing it's MCP.
  //   - Second array: native tools. Object.entries(nativeHandlers) turns the nativeHandlers object
  //     into [[name, fn], ...] pairs, then .map() wraps each fn in the same { execute, label } shape.
  //
  // The destructuring ([name, fn]) in the second map unpacks each [key, value] pair
  // from Object.entries() into named variables directly in the parameter list.

  const tools = [...mcpToolsToOpenAI(mcpTools), ...nativeTools];
  // Build the tools array to send to the LLM — the schema definitions (not the handlers).
  // mcpToolsToOpenAI() converts MCP format to OpenAI format.
  // nativeTools is already in OpenAI format (defined in tools.js).
  // Spread merges both arrays into one flat array.

  const agent = createAgent({ model, tools, instructions, handlers });
  // Create the agent, passing all four pieces it needs to run.
  // createAgent returns an object with a processQuery() method (see agent.js).

  console.log(`MCP tools: ${mcpTools.map((t) => t.name).join(", ")}`);
  console.log(`Native tools: ${Object.keys(nativeHandlers).join(", ")}`);
  // Print which tools are available before running queries.
  // .map((t) => t.name) extracts just the name from each tool object into an array.
  // .join(", ") joins array items into a single string: ["a", "b"] → "a, b"
  // Object.keys() returns an array of an object's keys — here the tool function names.

  const queries = [
    "What's the weather in Warsaw?",
    "What time is it in Europe/Warsaw?",
    "Calculate 42 multiplied by 17",
    "Convert 'hello world' to uppercase",
    "What's 25 + 17, and what's the weather in Gdansk?"
  ];
  // An array of test questions to send to the agent one by one.
  // The last query intentionally asks for two things to test whether the agent
  // can call multiple tools in one round.

  for (const query of queries) {
    await agent.processQuery(query);
  }
  // for...of loop — iterates over every item in the array.
  // We await each query so they run one after another, not in parallel.
  // Running them in parallel would mix up the console output.

  await mcpClient.close();
  await mcpServer.close();
  // Clean shutdown — close connections in reverse order (client first, then server).
  // Skipping this would leave the process hanging instead of exiting cleanly.
};

main().catch(console.error);
// Call main() to actually run the program — defining the function above doesn't run it.
// main() returns a Promise (because it's async).
// .catch(console.error) attaches an error handler: if anything inside main() throws
// an unhandled error, print it to the console instead of crashing silently.
// console.error is passed directly as a function reference — not called here,
// just handed to .catch() to call later if needed.
