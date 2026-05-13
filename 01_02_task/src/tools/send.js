// send.js — reusable function for submitting answers to the course Hub.
//
// Every task in the course uses the same /verify endpoint with the same
// payload shape: { apikey, task, answer }. Rather than copy-pasting this
// logic into every project, we keep it here and import it wherever needed.
//
// Usage example:
//   import { sendAnswer } from "./tools/send.js";
//   const response = await sendAnswer({ task: "findhim", answer: { ... } });

import { writeFile, mkdir } from "fs/promises";
import { resolve } from "path";
import { hubApiKey, hubBaseUrl } from "../config.js";

const OUTPUT_DIR = resolve(import.meta.dirname, "..", "..", "output");

// sendAnswer() submits a task answer to the Hub's /verify endpoint.
//
// It also saves the full payload to output/send.json before sending,
// so you always have a local record of what was submitted.
//
// Parameters (inside one object):
//   task   — string, the task name e.g. "findhim"
//   answer — object, the task-specific answer payload
//
// Returns: Promise<object> — the server's response, e.g. { code: 0, message: "{FLG:...}" }
export const sendAnswer = async ({ task, answer }) => {
  const payload = {
    apikey: hubApiKey,
    task,
    answer
  };

  // Ensure the output directory exists before writing.
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Save locally first — if the network call fails, you still have the payload.
  const savePath = resolve(OUTPUT_DIR, "send.json");
  await writeFile(savePath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`    Payload saved to output/send.json`);

  const response = await fetch(`${hubBaseUrl}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message ?? data?.error ?? `/verify failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
};
