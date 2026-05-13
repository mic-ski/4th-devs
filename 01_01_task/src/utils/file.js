import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

// Returns parsed JSON from a file, or null if the file doesn't exist.
export function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

// Writes data as formatted JSON, creating the directory if needed.
export async function safeWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  await writeFile(filePath, JSON.stringify(data, null, 2));
}
