import { AI_API_KEY, EXTRA_API_HEADERS, RESPONSES_API_ENDPOINT } from "../../config.js";

/**
 * Sends a prompt to the LLM and returns the parsed JSON response.
 * Uses the Responses API with Structured Output (textFormat = JSON schema).
 */
export async function chat({ model, input, textFormat }) {
  const response = await fetch(RESPONSES_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_API_KEY}`,
      ...EXTRA_API_HEADERS
    },
    body: JSON.stringify({
      model,
      input,
      text: { format: textFormat }
    })
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data?.error?.message ?? `HTTP ${response.status}`);
  }

  const outputText =
    data.output_text ??
    data.output
      ?.find(o => o.type === "message")
      ?.content?.find(c => c.type === "output_text")
      ?.text;

  if (!outputText) {
    throw new Error("No output_text in API response");
  }

  return JSON.parse(outputText);
}
