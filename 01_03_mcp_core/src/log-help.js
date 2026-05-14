/**
 * ═══════════════════════════════════════════════════════════════════
 * FILE: src/log.js — Console logging and display helpers
 * ═══════════════════════════════════════════════════════════════════
 *
 * Provides formatted console output for the MCP demo — section headings,
 * data logs, and specialised messages for client events like sampling
 * and elicitation.
 *
 * ANSI escape codes control colour and styling in the terminal.
 *
 * `clientLog` is an **object-as-instance** — a plain object with methods
 * grouped under a single name, used instead of a class. There is no `new`,
 * no prototype chain. The dot in `clientLog.connected()` is just normal
 * property access on a plain object.
 * ═══════════════════════════════════════════════════════════════════
 */

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};
// `c` is a plain object used as a lookup table of ANSI escape code strings (type: object).
// ANSI escape codes are special character sequences that terminals interpret as styling instructions.
// `\x1b[` is the escape character in hex — the number after the `[` selects the style.
// e.g. `\x1b[1m` turns on bold; `\x1b[0m` resets everything back to normal.
// Storing them here avoids repeating the same magic strings throughout the file.

const truncate = (value, maxLength = 50) => {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};
// Private helper — shortens any value to a display-safe length.
// `String(value)` coerces anything to a string regardless of its original type.
// `maxLength = 50` is a default parameter — used if the caller doesn't pass a second argument.
// `text.slice(0, maxLength)` returns the first `maxLength` characters as a new string.
// The ternary `condition ? a : b` is JS's inline if/else — if too long, append "...", else return as-is.
// Return type is always string.

const getErrorMessage = (cause) =>
  cause instanceof Error ? cause.message : String(cause);
// Arrow function with a one-line body — the expression is the implicit return value (no braces needed).
// `cause instanceof Error` checks whether `cause` is an Error object (JS's built-in error class).
// If it is, return `.message` (a string). If not, coerce it to a string with `String()`.
// Defensive because in JS you can `throw` literally anything — not just Error objects.
// Return type is always string.

export const heading = (title, description) => {
  console.log(`\n${c.bold}═══ ${title} ═══${c.reset}`);
  if (description) console.log(`${c.dim}${description}${c.reset}`);
};
// Exported function — prints a bold section header.
// `\n` in the template literal is a newline character — adds a blank line before the header.
// `c.bold` wraps the title in the bold ANSI code; `c.reset` turns bold off after it.
// `if (description)` — truthy check: skips the second line if description is empty, null, or undefined.
// `title` and `description` are both strings.

export const log = (label, data) => {
  console.log(`\n${c.bold}${c.cyan}▶ ${label}${c.reset}`);

  if (data === undefined) return;
  // Prints the label as a cyan bold header, then handles the data below.
  // `=== undefined` strict equality — only skips if data is literally undefined, not null or 0.
  // `return` with no value exits the function early — the lines below won't run.

  const lines = Array.isArray(data) ? data
    : typeof data === "string" ? [data]
    : JSON.stringify(data, null, 2).split("\n");
  // Converts `data` into an array of display strings — one string per console line.
  // Three cases, handled with chained ternaries:
  //   1. `Array.isArray(data)` — already an array, use it directly.
  //   2. `typeof data === "string"` — a string: wrap in an array so the loop below works uniformly.
  //   3. Otherwise (an object): `JSON.stringify(data, null, 2)` formats it as indented JSON,
  //      then `.split("\n")` breaks it into an array of lines.
  // `lines` is always an array of strings regardless of what `data` was.

  lines.forEach((line) => console.log(`${c.dim}  ${line}${c.reset}`));
  // `.forEach()` iterates every element in `lines`, calling the callback once per item.
  // `(line) => console.log(...)` — arrow function; `line` is a string for the current iteration.
  // Each line is printed dimmed (low-contrast) and indented two spaces for visual nesting under the label.
};

export const parseToolResult = (result) => {
  const text = result.content?.find((c) => c.type === "text")?.text ?? "";
  // `result.content` is the MCP tool result's content array (type: array of objects).
  // `.find((c) => c.type === "text")` — finds the first content block with type "text".
  // `?.text` — optional chaining: safely reads `.text` without crashing if `.find` returned undefined.
  // `?? ""` — nullish coalescing fallback: empty string if nothing was found.
  // `text` is always a string.

  if (result.isError) {
    throw new Error(text || "Tool call failed");
  }
  // `result.isError` is a boolean flag set by the MCP SDK when the tool reported an error.
  // `throw new Error(...)` — creates an Error object and throws it upward.
  // `text || "Tool call failed"` uses `||`: if `text` is empty/falsy, use the fallback message.
  // The difference from `??`: `||` triggers on any falsy value (empty string, 0, false), not just null/undefined.

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
  // Attempts to parse the text as JSON. If it succeeds, return the parsed object.
  // If `JSON.parse` throws (text is not valid JSON), the catch silently ignores the error and returns raw text.
  // `catch` without a variable — valid in modern JS when you don't need the error object.
};

export const clientLog = {
// **Object-as-instance pattern** — `clientLog` is a plain object, not a class instance.
// There is no `new clientLog()`, no prototype, no inheritance.
// The dot in `clientLog.spawningServer(...)` is just normal property access.
// This pattern groups related functions under one name without the overhead of a class.
// Each property is an arrow function — they don't use `this`, so that's fine.

  spawningServer: (serverPath) => {
    console.log(`\n${c.green}🚀 Spawning MCP server: ${serverPath}${c.reset}`);
  },
  // `serverPath` is a string — the absolute path to the server script being spawned.

  connected: () => {
    console.log(`${c.green}✓ Connected to MCP server via stdio${c.reset}`);
  },
  // No parameters — just prints a success message after the MCP handshake completes.

  samplingRequest: ({ messages, maxTokens }) => {
    console.log(`\n${c.magenta}  📡 Sampling — server asked the client to call an LLM${c.reset}`);
    console.log(`${c.dim}     Messages: ${messages.length}, max tokens: ${maxTokens ?? "default"}${c.reset}`);
  },
  // Parameter is destructured inline: `{ messages, maxTokens }` pulls those two from the passed object.
  // `messages` is an array — `.length` gives the count (type: number).
  // `maxTokens ?? "default"` — nullish coalescing: shows "default" if maxTokens is null/undefined.

  samplingResponse: (text) => {
    console.log(`${c.dim}     LLM responded: "${truncate(text)}"${c.reset}`);
  },
  // `text` is a string — the LLM's response.
  // `truncate(text)` prevents very long responses from flooding the console.

  samplingError: (cause) => {
    console.error(`${c.red}     Sampling error: ${getErrorMessage(cause)}${c.reset}`);
  },
  // `console.error` writes to stderr (separate from stdout) — shows red in most terminals.
  // `getErrorMessage(cause)` safely extracts the message whether `cause` is an Error or a plain value.

  elicitationRequest: ({ mode }) => {
    console.log(`\n${c.yellow}  🔔 Elicitation — server asked the client for user confirmation${c.reset}`);
    console.log(`${c.dim}     Mode: ${mode}${c.reset}`);
  },
  // Destructures only `mode` from the params object — ignores any other properties.
  // `mode` is a string (e.g. "form").

  autoAcceptedElicitation: (content) => {
    console.log(`${c.dim}     Auto-accepted with: ${JSON.stringify(content)}${c.reset}`);
  }
  // `content` is a plain object — the auto-filled form values.
  // `JSON.stringify(content)` (no extra args) compacts it to a single-line string for the log.
};
