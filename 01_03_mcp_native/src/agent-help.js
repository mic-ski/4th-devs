/**
 * Agent loop — processes queries using a unified set of tool handlers.
 *
 * The agent doesn't know whether a tool is served by MCP or native JS.
 * It just dispatches to the handler map built by app.js. Each handler
 * has { execute, label } so the output shows which backend ran the tool.
 */
// This file is the "brain" of the agent. It runs a loop: send message to the LLM,
// check if the LLM wants to call a tool, run the tool, send the result back,
// repeat — until the LLM gives a plain text answer or we hit the round limit.

import { chat, extractToolCalls, extractText } from "./ai.js";
import { logQuery, logToolCall, logToolResult, logToolError, logToolCount, logResponse } from "./log.js";
// Importing named exports from other files in the same project.
// Each name in {} must match exactly what those files export.

const MAX_TOOL_ROUNDS = 10;
// A safety limit — if the LLM keeps calling tools without giving a final answer,
// we stop after 10 rounds to avoid an infinite loop.

const executeToolCall = async (call, handlers) => {
// async function — it does async work (calling a tool handler that may be async),
// so we mark it async and can use await inside.
// Arrow function assigned to a const — this is just a regular function, defined this way for style.
// 'call' is an object describing one tool call the LLM wants to make: { name, arguments, call_id }
// 'handlers' is an object mapping tool names to { execute, label }

  const args = JSON.parse(call.arguments);
  // call.arguments is a JSON string like '{"a": 2, "b": 3}'.
  // JSON.parse() converts it into a real JS object so we can pass it to the handler.

  const handler = handlers[call.name];
  // Look up the handler by tool name — e.g. handlers["calculate"] gives us { execute, label }.
  // If the LLM hallucinated a tool name that doesn't exist, handler will be undefined.

  if (!handler) {
    throw new Error(`Unknown tool: ${call.name}`);
  }
  // Guard clause — if the tool doesn't exist, throw immediately.
  // throw stops execution and jumps to the nearest catch block.
  // The backtick string with ${} is a template literal — like an f-string in Python.

  logToolCall(handler.label, call.name, args);
  // Just logging to the console so we can see what tool is being called and with what args.

  try {
    const result = await handler.execute(args);
    // handler.execute is the actual function that runs the tool (native JS or MCP).
    // await pauses here until the async function finishes and returns its result.

    logToolResult(result);
    return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) };
    // Return a tool result object in the format the OpenAI/Responses API expects.
    // call_id links this result back to the specific tool call the LLM made.
    // JSON.stringify() converts the result object back into a string for the API.

  } catch (error) {
    logToolError(error.message);
    return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify({ error: error.message }) };
    // If the tool threw an error, we don't crash the whole agent.
    // Instead we send the error message back to the LLM as the tool result,
    // so the LLM can decide what to do (retry, apologise, etc.).
  }
};

/**
 * @param {object} config
 * @param {string} config.model — model identifier
 * @param {Array} config.tools — OpenAI-format tool definitions
 * @param {string} config.instructions — system prompt
 * @param {object} config.handlers — { toolName: { execute, label } }
 */
export const createAgent = ({ model, tools, instructions, handlers }) => ({
// Exported function that takes one object argument and destructures it into 4 named values.
// The => ({ ... }) syntax returns an object literal directly — the outer () are needed so JS
// doesn't confuse the {} of the object with the {} of a function body.
// So createAgent(...) returns an object with one method: processQuery.

  async processQuery(query) {
  // Method on the returned object. async because it calls await inside.
  // query is the user's message string, e.g. "what is 2 + 3?"

    logQuery(query);

    const chatConfig = { model, tools, instructions };
    // Grouping the static config into one object so we don't repeat these three values
    // every time we call chat(). { model } is shorthand for { model: model }.

    let conversation = [{ role: "user", content: query }];
    // The conversation history sent to the LLM — starts with just the user message.
    // It's let (not const) because we'll reassign it each round as it grows.
    // The LLM needs the full history each time so it remembers what happened.

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Standard for loop — runs up to MAX_TOOL_ROUNDS times.
    // Each iteration is one exchange: we send the conversation, get a response, handle it.

      const response = await chat({ ...chatConfig, input: conversation });
      // chat() sends the conversation to the LLM and returns its response.
      // { ...chatConfig, input: conversation } uses the spread operator to merge chatConfig
      // and the new input key into one object — like { model, tools, instructions, input: conversation }.
      // await pauses until the API call completes.

      const toolCalls = extractToolCalls(response);
      // Pulls out any tool calls the LLM wants to make from the response.
      // Returns an array — empty array if the LLM gave a plain text answer instead.

      if (toolCalls.length === 0) {
        const text = extractText(response) ?? "No response";
        // extractText() gets the plain text from the response.
        // ?? is the nullish coalescing operator — if extractText() returns null or undefined,
        // use "No response" as the fallback value instead.

        logResponse(text);
        return text;
        // No tool calls means the LLM is done — return the final answer and exit the loop.
      }

      logToolCount(toolCalls.length);
      const toolResults = await Promise.all(
        toolCalls.map((call) => executeToolCall(call, handlers))
      );
      // The LLM may request multiple tool calls at once — we run all of them in parallel.
      // toolCalls.map() creates an array of Promises (one per tool call).
      // Promise.all() waits for ALL of them to finish before continuing.
      // await pauses here until every tool has returned a result.

      conversation = [...conversation, ...response.output, ...toolResults];
      // Append the LLM's response (which contains the tool call requests) and
      // the tool results to the conversation history.
      // ...spread merges all three arrays into one new array.
      // We reassign conversation (not push) because spread creates a new array.
    }

    logResponse("Max tool rounds reached");
    return "Max tool rounds reached";
    // If we exit the for loop without returning inside it, we hit the round limit.
    // Return a fallback message instead of silently returning undefined.
  }
});
