// The executor is the heart of the agent loop.
// It keeps sending the conversation to the AI until the AI stops calling tools
// and gives us a final text answer — or until we hit the safety limit.
//
// This file is intentionally identical in structure to 01_02_tool_use/src/executor.js.
// The same loop pattern works for any set of tools.

import { chat, extractToolCalls, extractText } from "./api.js";

// Safety limit: if the AI calls more than this many rounds of tools without
// giving a final answer, we stop to avoid an infinite loop.
const MAX_TOOL_ROUNDS = 10;

const logQuery = (query) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Query: ${query}`);
  console.log("=".repeat(60));
};

const logResult = (text) => console.log(`\nA: ${text}`);

// executeToolCalls() runs every tool the AI requested (in parallel),
// then packages each result in the format the API expects.
//
// Parameters:
//   toolCalls — array of tool call objects from the AI response
//   handlers  — object whose keys are tool names and values are async functions
//
// Returns: array of result objects ready to be appended to the conversation
const executeToolCalls = async (toolCalls, handlers) => {
  console.log(`\nTool calls: ${toolCalls.length}`);

  return Promise.all(
    toolCalls.map(async (call) => {
      // The AI sends arguments as a JSON string — we parse it into an object.
      const args = JSON.parse(call.arguments);
      console.log(`  → ${call.name}(${JSON.stringify(args)})`);

      try {
        const handler = handlers[call.name];
        if (!handler) throw new Error(`Unknown tool: ${call.name}`);

        const result = await handler(args);
        console.log(`    ✓ Success`);

        // The result must be JSON-stringified and tagged with the call_id
        // so the API can match it to the right tool request.
        return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) };
      } catch (error) {
        console.log(`    ✗ Error: ${error.message}`);
        return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify({ error: error.message }) };
      }
    })
  );
};

// processQuery() runs one complete agent conversation from start to finish.
//
// Parameters:
//   query       — string, the user message that starts the conversation
//   model       — string, the AI model to use
//   tools       — array of tool definition objects
//   handlers    — object mapping tool names to handler functions
//   instructions — string, the system prompt
//
// Returns: string, the AI's final text response
export const processQuery = async (query, { model, tools, handlers, instructions }) => {
  const chatConfig = { model, tools, instructions };
  logQuery(query);

  // The conversation starts with just the user's message.
  // Each round, we grow it by appending tool calls and their results.
  // This is how the AI "remembers" what happened in previous rounds.
  // When this function exits, the conversation is discarded — the next
  // call to processQuery starts fresh. This is how we isolate each person.
  let conversation = [{ role: "user", content: query }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await chat({ ...chatConfig, input: conversation });
    const toolCalls = extractToolCalls(response);

    // If the AI returned no tool calls, it has finished — return the text.
    if (toolCalls.length === 0) {
      const text = extractText(response) ?? "No response";
      logResult(text);
      return text;
    }

    // Execute the tool calls and collect results.
    const toolResults = await executeToolCalls(toolCalls, handlers);

    // Grow the conversation: old messages + the AI's tool call requests + our results.
    // On the next iteration the AI sees everything that happened so far.
    conversation = [
      ...conversation,
      ...toolCalls,
      ...toolResults
    ];
  }

  logResult("Max tool rounds reached");
  return "Max tool rounds reached";
};
