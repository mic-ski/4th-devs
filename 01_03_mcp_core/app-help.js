/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: app.js — Entry point for the MCP Core Demo
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is the main script you run directly (e.g. `node app.js`).
 * It acts as an MCP *client* that spawns the server as a subprocess
 * and exercises every MCP feature in sequence: tools, resources, prompts.
 *
 * Think of it as the integration demo that shows the full MCP lifecycle
 * in one readable flow. The server runs in a child process behind the
 * scenes; this file drives it by sending MCP requests.
 * ═══════════════════════════════════════════════════════════════════
 */

import { createMcpClient } from "./src/client.js";
// Imports the factory function that creates and connects an MCP client.
// A factory function is a plain function that builds and returns an object — a common JS pattern
// used instead of classes. `createMcpClient` is not a class; it's a function that returns a connected client.

import { heading, log, parseToolResult } from "./src/log.js";
// Destructuring import — pulls three named exports out of log.js in one line.
// `{ heading, log, parseToolResult }` picks exactly those three from the module.
// These are display/formatting helpers used throughout this file.

import { resolveModelForProvider } from "../config.js";
// Imports a helper from the parent directory's config.js.
// `../` goes one level up from the current file's directory.

const model = resolveModelForProvider("gpt-5.1");
// Calls the config helper to resolve which AI model to use.
// The string "gpt-5.1" is a hint — config maps it to an actual model name
// depending on environment variables (e.g. OpenRouter vs OpenAI directly).
// `model` is a string.

const main = async () => {
// Defines `main` as an async arrow function and assigns it to `const`.
// `async` means the function returns a Promise and you can use `await` inside it.
// Arrow functions (`=>`) are anonymous functions assigned to variables. This one takes no arguments.

  const client = await createMcpClient({ model });
  // `await` pauses execution until `createMcpClient` finishes.
  // `createMcpClient` is async because it spawns a subprocess and waits for the server to be ready.
  // `{ model }` is shorthand for `{ model: model }` — when the key and variable name match, JS lets you shorten it.
  // `client` is the connected MCP client object with methods like listTools, callTool, etc. (type: object)

  try {
  // `try/catch/finally` is JS error handling. Anything that throws inside `try` is caught.
  // Without this, an error would crash the whole process and skip cleanup.

    heading("TOOLS", "Actions the server exposes for the LLM to invoke");
    // Prints a bold section header to the console.
    // `heading` is a helper from log.js that formats output with ANSI colour codes.

    const { tools } = await client.listTools();
    // `client.listTools()` is async — sends an MCP request to the server and waits for the response.
    // The server returns an object like `{ tools: [...] }`.
    // `const { tools } = ...` is destructuring — pulls just the `tools` array out of that object.
    // `tools` is an array of objects, each with at least `name` and `description` properties.

    log("listTools", tools.map((t) => `${t.name} — ${t.description}`));
    // `.map()` transforms every element in `tools` into a formatted string.
    // `(t) => \`${t.name} — ${t.description}\`` — arrow function passed to `.map()`.
    // Template literals use backticks and `${}` to embed variables — similar to Python f-strings.
    // The result passed to `log` is an array of strings (type: string[]).

    const calcResult = await client.callTool({
      name: "calculate",
      arguments: { operation: "multiply", a: 42, b: 17 }
    });
    // Calls the "calculate" tool on the server with specific arguments.
    // `callTool` is async — sends the request and waits for the server to execute the tool.
    // The argument is a plain object with `name` and `arguments` properties.
    // `calcResult` is the raw tool result (type: object with a `content` array inside).

    log("callTool(calculate)", parseToolResult(calcResult));
    // `parseToolResult` extracts the text from the MCP result object.
    // If the result is JSON it parses it; otherwise returns the raw string.

    const summaryResult = await client.callTool({
      name: "summarize_with_confirmation",
      arguments: {
        text: "The Model Context Protocol (MCP) is a standardized protocol that allows applications to provide context for LLMs. It separates the concerns of providing context from the actual LLM interaction. MCP servers expose tools, resources, and prompts that clients can discover and use.",
        maxLength: 30
      }
    });
    // Calls the "summarize_with_confirmation" tool — a more complex tool that triggers
    // both elicitation (user confirmation) and sampling (LLM call) during its execution.
    // While this `await` is paused, the server will call back into this client twice:
    // once to ask for confirmation, once to request an LLM completion.

    log("callTool(summarize_with_confirmation)", parseToolResult(summaryResult));
    // Same pattern — logs the tool result.

    heading("RESOURCES", "Read-only data the server makes available to clients");

    const { resources } = await client.listResources();
    // Lists all resources registered on the server — same destructuring pattern as listTools.
    // `resources` is an array of objects with `uri`, `name`, and `description` properties.

    log("listResources", resources.map((r) => `${r.uri} — ${r.name ?? r.description}`));
    // `r.name ?? r.description` is the nullish coalescing operator (`??`).
    // It means: use `r.name` if it's not null/undefined, otherwise fall back to `r.description`.
    // Not all resources have both fields — this handles whichever the server provided.

    const configResource = await client.readResource({ uri: "config://project" });
    // Reads a specific resource by its URI.
    // `config://project` is a custom URI scheme the server defines — it's just an address string.
    // The result is an object with a `contents` array.

    log("readResource(config://project)", JSON.parse(configResource.contents[0].text));
    // `configResource.contents[0].text` drills into the result:
    //   `contents` is an array → take index [0] → read its `.text` property (a JSON string).
    // `JSON.parse()` converts the JSON string into a JS object so it prints nicely.

    const statsResource = await client.readResource({ uri: "data://stats" });
    log("readResource(data://stats)", JSON.parse(statsResource.contents[0].text));
    // Same pattern — reads and parses the dynamic stats resource.

    heading("PROMPTS", "Reusable message templates with parameters");

    const { prompts } = await client.listPrompts();
    // Lists all prompt templates the server registered.
    // `prompts` is an array of prompt descriptor objects.

    log("listPrompts", prompts.map((p) => `${p.name} — ${p.description}`));
    // Same `.map()` pattern as tools and resources.

    const { messages } = await client.getPrompt({
      name: "code-review",
      arguments: {
        code: "function add(a, b) { return a + b; }",
        language: "javascript",
        focus: "readability"
      }
    });
    // Instantiates the "code-review" prompt template with runtime arguments.
    // `getPrompt` returns `{ messages: [...] }` — the filled-in prompt messages.
    // Destructuring immediately pulls `messages` out of the response.

    log("getPrompt(code-review)", messages.map((m) =>
      `[${m.role}] ${m.content?.text ?? JSON.stringify(m.content)}`
    ));
    // Maps each message to a readable string: role in brackets, then content.
    // `m.content?.text` uses optional chaining (`?.`) — safely reads `.text` without crashing
    // if `m.content` happens to be null or undefined.
    // `?? JSON.stringify(m.content)` falls back to a JSON string if `.text` doesn't exist.

  } finally {
    await client.close();
    // `finally` runs whether or not the `try` block threw an error.
    // This guarantees the client always shuts down cleanly — closing the server subprocess.
    // Without this, the server could be left running in the background after an error.
  }
};

main().catch(console.error);
// Calls `main()`, which returns a Promise (all async functions do).
// `.catch(console.error)` is shorthand for `.catch((err) => console.error(err))`.
// If `main` throws and isn't handled, the error is printed to stderr instead of being silently swallowed.
