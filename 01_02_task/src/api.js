// This file has two responsibilities:
//   1. Talk to the AI model (OpenAI / OpenRouter) — same as in 01_02_tool_use
//   2. Provide a helper for calling the course Hub API endpoints

import { AI_API_KEY, EXTRA_API_HEADERS, RESPONSES_API_ENDPOINT } from "../../config.js";
import { hubBaseUrl } from "./config.js";

// ---------------------------------------------------------------------------
// AI chat — sends a conversation to the model and returns the raw response.
// ---------------------------------------------------------------------------

// chat() sends the current conversation to the AI and gets a reply.
// The reply may contain tool calls (the AI asking us to run a function)
// or a plain text message when the AI is done.
//
// Parameters (all inside one object):
//   model        — string, e.g. "gpt-4.1-mini"
//   input        — array of conversation messages so far
//   tools        — array of tool definitions (JSON schemas)
//   toolChoice   — string, "auto" means the AI decides when to use tools
//   instructions — string, the system prompt
//
// Returns: the raw API response object (we parse it with extractToolCalls / extractText)
export const chat = async ({ model, input, tools, toolChoice = "auto", instructions }) => {
  const body = { model, input };

  if (tools) body.tools = tools;
  if (tools) body.tool_choice = toolChoice;
  if (instructions) body.instructions = instructions;

  const response = await fetch(RESPONSES_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
      ...EXTRA_API_HEADERS
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const message = data?.error?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
};

// extractToolCalls() looks through the AI response and picks out any
// function calls the AI wants us to execute.
//
// Returns: array of tool call objects (may be empty if AI just sent text)
export const extractToolCalls = (response) =>
  response.output.filter((item) => item.type === "function_call");

// extractText() pulls out the final text message from the AI response.
//
// Returns: string (the AI's reply) or null if there is no text yet
export const extractText = (response) => {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  const message = response.output.find((item) => item.type === "message");
  return message?.content?.[0]?.text ?? null;
};

// ---------------------------------------------------------------------------
// Hub API helper — calls the course's backend endpoints
// ---------------------------------------------------------------------------

// hubPost() sends a POST request to any endpoint on the course Hub.
//
// Parameters:
//   endpoint — string, e.g. "/api/location" or "/verify"
//   body     — object, will be JSON-serialised and sent as the request body
//
// Returns: parsed JSON response from the server (object or array)
export const hubPost = async (endpoint, body) => {
  const response = await fetch(`${hubBaseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  // We try to parse JSON even on error, because the server often sends
  // a useful error message in the body.
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message ?? data?.error ?? `Hub ${endpoint} failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
};
