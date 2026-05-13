/**
 * Logging helpers for the MCP native demo.
 *
 * Separates presentation from logic so the agent loop stays clean.
 * Color-coded labels distinguish MCP tools from native tools in output.
 */
// This file contains all the console output functions used by agent.js.
// Keeping them here means the agent loop stays focused on logic,
// and if you want to change how output looks, there's one place to do it.

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};
// An object holding ANSI escape codes — special strings that terminals interpret
// as formatting instructions (color, bold, dim) rather than printing literally.
// \x1b is the escape character in hex notation. The numbers after [ select the style.
// c.reset turns off all formatting — always needed after a colored section,
// otherwise the color bleeds into everything that follows.
// This object is not exported (no export keyword) — it's private to this file.

export const MCP_LABEL = `${c.cyan}🔌 MCP${c.reset}`;
export const NATIVE_LABEL = `${c.yellow}⚡ Native${c.reset}`;
// Pre-built label strings used in log output to show which backend ran a tool.
// Template literals build the string: cyan color code + text + reset code.
// These are exported so app.js can pass them as the label when building the handler map.

export const logQuery = (query) => {
  console.log(`\n${c.bold}${"═".repeat(60)}${c.reset}`);
  console.log(`${c.bold}Query: ${query}${c.reset}`);
  console.log(`${c.bold}${"═".repeat(60)}${c.reset}`);
};
// Prints a bold separator line, the query, and another separator.
// \n is a newline character — adds a blank line before the separator for readability.
// "═".repeat(60) calls the string's repeat() method to produce 60 copies of that character.
// This is equivalent to "═" * 60 in Python.

export const logToolCall = (label, name, args) => {
  console.log(`  ${label} ${c.bold}${name}${c.reset}(${c.dim}${JSON.stringify(args)}${c.reset})`);
};
// Prints which tool is being called and with what arguments.
// label is either MCP_LABEL or NATIVE_LABEL (defined above).
// JSON.stringify(args) converts the args object to a readable string for display.

export const logToolResult = (result) => {
  console.log(`       ${c.green}✓${c.reset} ${c.dim}${JSON.stringify(result)}${c.reset}`);
};
// Prints a green checkmark and the result. Indented to appear nested under the tool call line.

export const logToolError = (message) => {
  console.log(`       ${c.red}✗ Error: ${message}${c.reset}`);
};
// Prints a red X and the error message. Same indentation as logToolResult.

export const logToolCount = (count) => {
  console.log(`\n${c.dim}Tool calls: ${count}${c.reset}`);
};
// Prints how many tool calls the LLM requested in this round.
// c.dim makes it less visually prominent — it's informational, not the main output.

export const logResponse = (text) => {
  console.log(`\n${c.green}Assistant:${c.reset} ${text}`);
};
// Prints the LLM's final text response. Called when the agent loop finishes.
